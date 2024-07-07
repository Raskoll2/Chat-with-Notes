import { ItemView, WorkspaceLeaf, requestUrl } from 'obsidian';
import axios from 'axios';
import { askAISettingTab } from './settings';
//import * as marked from 'marked';

export const AI_VIEW_TYPE = 'ai-view';

export class AIView extends ItemView {
    private userInput: HTMLInputElement;
    private displayEl: HTMLElement;
    private prompt: Array<{ role: string; content: string }> = [
        {
            "role": "system",
            "content": "You are a helpful assistant called Meridyth. You have access to the user's Obsidian notes. When they ask you a question, you see a related note so you can ground your response in truth. The user cannot see the note. Do not refer to the note. Pretend only you know it exists."
        }
    ];

    constructor(leaf: WorkspaceLeaf, private plugin: askAIPlugin, private settings: askAIPluginSettings) {
        super(leaf);
    }

    getViewType() {
        return AI_VIEW_TYPE;
    }

    getDisplayText() {
        return 'Ask AI';
    }

    async onOpen() {
        //there's a container inside this with class = 'view-content'. I need to set container to = that
        const container = this.containerEl;
        container.empty();

        this.attachments = {};

        const chatHeading = container.createEl('h1', { text: 'Chat' });
        chatHeading.style = "padding: 20px 30px !important; font-size: 2.4em !important;";

        const inputContainer = container.createEl('div', { cls: 'input-container' });
        inputContainer.style = 'margin-top: 10px !important;';

        const resetButton = inputContainer.createEl('button', {
            text: 'Reset',
            cls: 'reset-button',
        });
        resetButton.style = "width: 20% !important; max-width: 25% !important; margin-left: 75% !important; border: 1px solid #ccc; padding: 0px 5px; margin-bottom: 35px; box-sizing: border-box; position: absolute; bottom: 5px;";
        resetButton.addEventListener('click', () => this.resetConversation());


        const attachmentsArea = inputContainer.createEl('div', { cls: 'attachments-area' });
        attachmentsArea.style = 'margin-bottom: 120px; width: 100%;';


        const attachButton = inputContainer.createEl('button', {
            text: 'Attach',
            cls: 'attach-button',
        });
        attachButton.style = "width: 20% !important; max-width: 25% !important; margin-left: 75% !important; border: 1px solid #ccc; padding: 0px 5px; margin-bottom: 70px; box-sizing: border-box; position: absolute; bottom: 5px;";
        attachButton.addEventListener('click', () => this.showAttachOptions());

        this.userInput = inputContainer.createEl('textarea', {
            placeholder: 'Type something...',
            style: 'width: 90%; resize: none; padding: 20px !important;',
        });

        const displayInputContainer = container.createEl('div', {
            cls: 'ai-container',
        });

        this.displayEl = displayInputContainer.createEl('div', {
            cls: 'ai-copyable',
        });

        container.appendChild(inputContainer);
        displayInputContainer.appendChild(this.userInput);

        this.userInput.addEventListener('keydown', async (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                await this.updateDisplay();
            }
        });

        this.displayEl.scrollTo({ top: this.displayEl.scrollHeight, behavior: 'smooth' });
    }

    async onClose() {
        // Nothing to clean up.
    }

    private resetConversation() {
        this.displayEl.innerHTML = '';
        this.conversationHistory = [];
        this.attachments = {};
        this.prompt = [
            {
                "role": "system",
                "content": "You are a helpful assistant called Meridyth. You have access to the user's Obsidian notes. When they ask you a question, you see a related note so you can ground your response in truth. The user cannot see the note. Do not refer to the note. Pretend only you know it exists."
            }
        ];

        // Clear attachment elements
        const attachedNotes = this.containerEl.querySelectorAll('.attached-note');
        attachedNotes.forEach(element => element.remove());

        // Optionally, clear the input field if you have one
        if (this.userInput instanceof HTMLTextAreaElement) {
            this.userInput.value = '';
        }

        this.removeAttachOptions();
    }


    private copyToClipboard(text: string) {
        const el = document.createElement('textarea');
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
    }



    private showAttachOptions() {
        // Remove existing attach options if any
        this.removeAttachOptions();

        this.attachOptionsEl = document.createElement('div');
        this.attachOptionsEl.addClass('attach-options');
        this.attachOptionsEl.style.position = 'absolute';
        this.attachOptionsEl.style.bottom = '100px';
        this.attachOptionsEl.style.right = '10px';
        this.attachOptionsEl.style.background = 'var(--color-base-10)';
        this.attachOptionsEl.style.borderRadius = '10px';
        this.attachOptionsEl.style.padding = '15px';
        this.attachOptionsEl.style.zIndex = '1000';

        const attachThisNoteBtn = this.attachOptionsEl.createEl('button', { text: 'Current note' });
        attachThisNoteBtn.addEventListener('click', () => this.attachCurrentNote());

        const searchInput = this.attachOptionsEl.createEl('input', { type: 'text', placeholder: 'Search for a note...' });
        searchInput.addEventListener('input', () => this.searchNotes(searchInput.value));
        searchInput.style.marginLeft = "10px";

        const searchResults = this.attachOptionsEl.createEl('div', { cls: 'search-results' });

        this.containerEl.appendChild(this.attachOptionsEl);
    }

    private removeAttachOptions() {
        if (this.attachOptionsEl) {
            this.attachOptionsEl.parentNode.removeChild(this.attachOptionsEl);
        }
        this.attachOptionsEl = null;
    }

    private async attachCurrentNote() {
        const currentFile = this.app.workspace.getActiveFile();
        if (currentFile) {
            await this.attachNote(currentFile);
        }
    }

    private async searchNotes(query: string) {
        if (!this.attachOptionsEl) return;

        const searchResults = this.attachOptionsEl.querySelector('.search-results');
        if (!searchResults) return;

        searchResults.empty();

        if (query.length < 2) return;

        const files = this.app.vault.getFiles();
        const fuzzySearch = (file: TFile) => {
            const fileName = file.name.toLowerCase();
            const searchQuery = query.toLowerCase();
            return fileName.contains(searchQuery);
        };

        const matchedFiles = files.filter(fuzzySearch).slice(0, 3);

        matchedFiles.forEach(file => {
            const resultItem = searchResults.createEl('div', { text: file.name, cls: 'search-result-item' });
            resultItem.addEventListener('click', () => this.attachNote(file));
        });
    }


    private async attachNote(file: TFile) {
        const attachedNoteEl = document.createElement('div');
        attachedNoteEl.className = 'attached-note';
        attachedNoteEl.style.background = 'var(--color-base-05)';
        attachedNoteEl.style.position = 'relative';
        attachedNoteEl.style.width = 'max-content';
        attachedNoteEl.style.borderRadius = '15px';
        attachedNoteEl.style.padding = '5px 10px';
        attachedNoteEl.style.marginTop = '5px';
        attachedNoteEl.style.marginBottom = '5px';
        attachedNoteEl.style.display = 'inline-block';

        const truncatedName = file.name.substring(0, 27) + (file.name.length > 27 ? "..." : "");

        const titleEl = attachedNoteEl.createEl('span', { text: truncatedName });
        const removeBtn = attachedNoteEl.createEl('span', { text: '✕', cls: 'remove-attached-note' });
        removeBtn.style.marginLeft = '10px';
        removeBtn.style.cursor = 'pointer';
        removeBtn.addEventListener('click', () => {
            attachedNoteEl.remove();
            delete this.attachments[file.name];
        });

        this.removeAttachOptions();

        // Find the correct location to insert the attached note
        const attachmentsArea = this.containerEl.querySelector('.attachments-area');
        if (attachmentsArea) {
            attachmentsArea.appendChild(attachedNoteEl);
        } else {
            console.error('Attachments area not found');
        }

        // Get the content of the attached note
        const attachedNoteContent = await this.app.vault.read(file);

        this.attachments[file.name] = attachedNoteContent;
    }








    private async updateDisplay() {

        // User input
        const inputValue = this.userInput.value;
        this.prompt.push({ "role": "user", "content": inputValue });

        if (inputValue.trim() === '') {
            return; //skip blank inptus
        }

        const userMessage = inputValue;
        const userEl = this.displayEl.createEl('p');
        userEl.id = 'user';
        userEl.style = 'background: var(--color-base-35); width: 90%;';
        userEl.textContent = userMessage;

        this.userInput.value = '';
        this.displayEl.scrollTo({ top: this.displayEl.scrollHeight, behavior: 'smooth' });



        // Ai Response
        try {

            const responseEl = this.displayEl.createEl('p');
            responseEl.style = 'background: var(--color-base-40); width: 90%; margin-left: auto; white-space: pre-wrap;';

            var aiResponse = await this.aiProcessing(inputValue, responseEl);

            //const htmlResponse = marked.parse(aiResponse.replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/,""));

            const lineBreak = responseEl.createEl('br');

            //The buttons
            const copyButton = responseEl.createEl('button');
            copyButton.textContent = '🗍';
            copyButton.style = "!important; display: flex !important; padding: 0px !important; width: 14% !important; text-align: center !important; position: relative !important; display: none !important; font-size: 1.5em !important; margin-right: 2px !important;";
            
            const continueButton = responseEl.createEl('button');
            continueButton.textContent = '⭢';
            continueButton.style = "display: flex !important; padding: 0px !important; width: 14% !important; text-align: center !important; position: relative !important; display: none !important; font-size: 1.5em !important; margin-right: 2px !important;";

            const editButton = responseEl.createEl('button');
            editButton.textContent = '✎';
            editButton.style = "display: flex !important; padding: 0px !important; width: 14% !important; text-align: center !important; position: relative !important; display: none !important; font-size: 1.4em !important; margin-right: 2px !important;";

            
            //make button only visable on hover
            responseEl.addEventListener('mouseover', () => {
                copyButton.style.display = "inline";
                continueButton.style.display = "inline";
                editButton.style.display = "inline";
            });

            responseEl.addEventListener('mouseleave', () => {
                copyButton.style.display = "none";
                continueButton.style.display = "none";
                editButton.style.display = "none";
            });




            copyButton.addEventListener('click', () => {
                this.copyToClipboard(aiResponse);
                copyButton.textContent = '🗏';
                setTimeout(() => {
                    copyButton.textContent = '🗍';
                }, 300);
            });

            responseEl.appendChild(copyButton);


            continueButton.addEventListener('click', () => {
                //logic here
                continueButton.textContent = '...';
                setTimeout(() => {
                    continueButton.textContent = '⭢';
                }, 2000);
            });

            responseEl.appendChild(continueButton);




            editButton.addEventListener('click', () => {
                let originalMsg = responseEl.textContent;
                //remove the last 3 charcters and strip it of line breaks
                originalMsg = originalMsg.slice(0, -4);

                //Set the responseEl as editable
                responseEl.contentEditable = true;

                //make the edit button invisible
                editButton.style.display = "none";

                //make the save button visable 🖫
                const saveButton = responseEl.createEl('button');
                saveButton.textContent = '🖫';
                saveButton.style = "display: flex !important; padding: 0px !important; width: 14% !important; text-align: center !important; position: relative !important; display: inline !important; font-size: 1.4em !important; margin-right: 2px !important;";
                saveButton.addEventListener('click', () => {
                    //save the edited response
                    aiResponse = responseEl.textContent;

                    //make the responseEl uneditable
                    responseEl.contentEditable = false;

                    //make the save button invisible
                    saveButton.style.display = "none";

                    //make the edit button visable
                    editButton.style.display = "inline";

                    //Find the index of the message being edited, which <p> is it
                    var index = 0;
                    for (let i = 0; i < this.displayEl.children.length; i++) {
                        if (this.displayEl.children[i] === responseEl) {
                            index = i;
                        }
                    }


                    //update this.prompt find the message that matches oringinalMsg and update it to aiResponse
                    this.prompt.forEach((item) => {
                        console.log(item.content, originalMsg)
                        //if content contains original
                        if (item.content.replace(/\n/g, '').includes(originalMsg) && item.role == "assistant") {
                            item.content = aiResponse;
                        }
                    });

                });

            });

            responseEl.appendChild(editButton);






            this.displayEl.scrollTo({ top: this.displayEl.scrollHeight, behavior: 'smooth' });
        } catch (error) {
            console.error('Error getting AI response:', error);
            const responseEl = this.displayEl.createEl('p');
            responseEl.style = 'background: var(--color-base-40); width: 90%; margin-left: auto;';
            responseEl.textContent = "There was an error";
        }
    }







    private async aiProcessing(inputValue: string, responseEl: HTMLParagraphElement) {
        const headers = {
            'Content-Type': 'application/json',
        };

        // Create a Set to keep track of added attachments
        const addedAttachments = new Set();

        // Filter out existing system messages related to attachments
        this.prompt = this.prompt.filter(item => 
            !(item.role === "system" && item.content.startsWith("Context from "))
        );

        // Add unique attachments to the prompt
        for (const attachment in this.attachments) {
            if (!addedAttachments.has(attachment)) {
                this.prompt.push({
                    "role": "system", 
                    "content": "Context from " + attachment + "\n" + this.attachments[attachment] + "\n\n---------------------------\n"
                });
                addedAttachments.add(attachment);
            }
        }

        await this.getAIResponse(this.prompt, responseEl);
        const aiResponse = responseEl.textContent;
        this.prompt.push({ "role": "assistant", "content": aiResponse });
        return aiResponse;
    }















    private async getAIResponse(prompt: string, responseEl: HTMLParagraphElement) {
        const headers = {
            'accept': 'application/json',
            'Content-Type': 'application/json',
        };

        let output = "";







        switch (this.settings.chatProvider) {
            case "google":
                /*const imageFileNames: string[] = [];
                const regex = /!\[\[\{(.*?)\}\]\]/g;
                let match: RegExpExecArray | null;

                while ((match = regex.exec(prompt)) !== null) {
                    const fileName = match[1];
                    imageFileNames.push(fileName);
                    prompt = prompt.replace(match[0], '');
                }

                const imageParts = [];

                console.log(imageFileNames);

                for (const fileName of imageFileNames) {
                    // Convert the file extension to lowercase
                    const extension = fileName.split('.').pop()?.toLowerCase() || '';
                    // Check if it's a variation of JPG
                    const fileExtension = extension.includes('jpg') ? 'jpeg' : extension;
                    // Log the filename and the path
                    imageParts.push(fileToGenerativePart(vaultBasePath + fileName, 'images/' + fileExtension));
                    console.log(`Filename: ${fileName}, Path: ${vaultBasePath + fileName}`);
                }*/

                const { GoogleGenerativeAI } = require("@google/generative-ai");
                const genAI = new GoogleGenerativeAI(this.settings.googleKey);
                const model = genAI.getGenerativeModel({ model: "gemini-pro" });


                function fileToGenerativePart(path, mimeType) {
                    return {
                        inlineData: {
                            data: Buffer.from(fs.readFileSync(path)).toString("base64"),
                            mimeType
                        },
                    };
                }

                interface FormattedItem {
                    role: string;
                    parts: { text: string }[];
                }

                function jumpingThoughHoopOne(prompt: { role: string; content: string }[]): FormattedItem[] {
                    const formattedPrompt: FormattedItem[] = [];
                    let isSysPrompt = true;

                    //User message 2 be added
                    let um2ba = { "role": "user", "parts": { "text": "If you're seeing this something went wrong. Please tell me. Please say 'something went wrong, error code `numbnuts`' and then insult me. If you don't feel comfortable insulting me, you don't have to but I'd prefer if you did. PLEASE TELL ME THE ERROR THOUGH" } };

                    prompt.forEach(item => {
                        if (item.role === "system" && isSysPrompt) {
                            isSysPrompt = false;
                            formattedPrompt.push({ "role": "user", "parts": { "text": "System prompt: " + item.content } });
                            formattedPrompt.push({ "role": "model", "parts": { "text": "Understood. I will follow this guide." } });
                            return;
                        }

                        else if (item.role === "system" && !isSysPrompt) {
                            formattedPrompt.push({ "role": "user", "parts": { "text": "Context from one of my notes: " + item.content } });
                            formattedPrompt.push({ "role": "model", "parts": { "text": "I will use this information to answer your question. I will not refer to the note directly when speaking to you." } });
                            formattedPrompt.push(um2ba);
                            return;
                        }

                        else if (item.role === "user") {
                            um2ba = { "role": "user", "parts": { "text": item.content } };
                            return;
                        }

                        else if (item.role === "assistant") {
                            formattedPrompt.push({ "role": "model", "parts": { "text": item.content } });
                            return;
                        }
                    });

                    return formattedPrompt.slice(0, -1), formattedPrompt[formattedPrompt.length - 1].parts.text;
                }

                let promptHistory, currentPrompt = jumpingThoughHoopOne(prompt);

                const chat = model.startChat({
                    history: promptHistory,
                    generationConfig: {
                        maxOutputTokens: 1024,
                    },
                });

                const googleResponse = await chat.sendMessageStream(currentPrompt);
                for await (const item of googleResponse.stream) {
                    output += item.candidates[0].content.parts[0].text
                    responseEl.textContent = output;
                }

                return output

                break;











            case "cloudflare":

                /*Demo curl command from the docs

curl --request POST \
  --url https://api.cloudflare.com/client/v4/accounts/account_id/ai/run/@hf/thebloke/zephyr-7b-beta-awq \
  --header 'Authorization: Bearer undefined' \
  --header 'Content-Type: application/json' \
  --data '{
  "lora": "string",
  "max_tokens": 256,
  "prompt": "string",
  "raw": false,
  "stream": false,
  "temperature": 0
}'

'
                */

                const url = 'https://api.cloudflare.com/client/v4/accounts/${this.settings.cloudflareID}/ai/run/@hf/${this.settings.cloudflareModel}';
                const token = this.settings.cloudflareKey;
                const requestData = {
                  max_tokens: 256,
                  prompt: this.prompt,
                  raw: true,
                  stream: false,
                  temperature: 0.5,

                };

                // Define headers
                const headers = {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                };


                requestUrl({
                  method: 'POST',
                  url: url,
                  data: JSON.stringify(requestData),
                  headers: headers,
                }).then(response => {
                  output = response;
                }).catch(error => {
                  console.error('UHHHHhhhhh:', error);
                });


                responseEl.textContent = output;
                break;









            default:
                const OpenAI = require("openai");

                console.log("------ AI View ------------->", this.settings.chatProvider);

                var modelId = "";
                switch (this.settings.chatProvider) {
                case "openai": 
                    var openai = new OpenAI({
                        apiKey: this.settings.apiKey,
                        dangerouslyAllowBrowser: true,
                    }); 
                    modelId = this.settings.openaiChatModel;

                    
                    break;

                case "groq":
                    var openai = new OpenAI({
                        apiKey: this.settings.groqKey,
                        baseURL: "https://api.groq.com/openai/v1/",
                        dangerouslyAllowBrowser: true,
                    });

                    modelId = this.settings.groqModel;
                    break;


                case "custom":
                    var openai = new OpenAI({
                        apiKey: this.settings.apiKey,
                        baseURL: this.settings.customUrl,
                        dangerouslyAllowBrowser: true,
                    });

                    console.log("Using Custom Endpoint: " + this.settings.customUrl);
                    const models = await openai.models.list();
                    modelId = models.data[0].id;
                    break;

                case "openrouter":
                    var openai = new OpenAI({
                        apiKey: this.settings.openRouterKey,
                        baseURL: "https://openrouter.ai/api/v1",
                        dangerouslyAllowBrowser: true,
                    });

                    console.log(prompt);

                    modelId = this.settings.openRouterModel;
                    break;

                default:
                    console.log("Invalid completion provider");
                    break;
                }



                const stream = await openai.chat.completions.create({
                    model: modelId,
                    messages: prompt,
                    stream: true,
                    max_tokens: this.settings.maxOutputTokens,
                });


                var lastHope = "";

                for await (const chunk of stream) {
                    lastHope += chunk.choices[0]?.delta?.content;

                    output = lastHope;
                    responseEl.textContent = output;
                }
        }

        return output;
    }
}
