import { Plugin, WorkspaceLeaf, Vault, obsidian} from 'obsidian';
import { AIView, AI_VIEW_TYPE } from './ai-view';
import { askAISettingTab } from './settings';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

interface askAIPluginSettings {
    chatProvider: string;
    completionProvider: string;
    groqKey: string;
    groqModel: string;
    googleKey: string;
    googleVis: bool;
    openaiKey: string;
    openaiChatModel: string;
    openaiCompleteModel: string;
    customUrl: string;
    maxTokens: number;
}

const DEFAULT_SETTINGS: askAIPluginSettings = {
    chatProvider: 'openai',
    completionProvider: 'openai',
    groqKey: '',
    groqModel: 'llama3-8b-8192',
    googleKey: '',
    googleVis: false,
    openaiKey: '',
    openaiChatModel: 'gpt-3.5-turbo',
    openaiCompleteModel: 'gpt-3.5-turbo-instruct',
    cloudflareID: '',
    cloudflareKey: '',
    cloudflareModel: "thebloke/zephyr-7b-beta-awq",
    customUrl: 'http://localhost:5001/v1',
    maxTokens: 96,
};

export default class askAIPlugin extends Plugin {
    settings: askAIPluginSettings;
    childProcess: any;

    async onload() {
        await this.loadSettings();
        this.addSettingTab(new askAISettingTab(this.app, this));

        this.registerView(
            AI_VIEW_TYPE,
            (leaf) => new AIView(leaf, this, this.settings)
        );

        //@ts-ignore
        const vaultBasePath = this.app.vault.adapter.basePath;

        const pluginDirectoryPath = path.join(vaultBasePath, '.obsidian', 'plugins', this.manifest.id);

        // Normalize the path without enclosing it in double quotes
        const normalizedPluginDirectoryPath = path.normalize(pluginDirectoryPath);


        this.addCommand({
            id: 'expand',
            name: 'Expand',
            hotkeys: [
                {
                    modifiers: ['Shift'],
                    key: '|',
                },
            ],
            callback: () => this.expand(),
        });



        this.addRibbonIcon("brain-circuit", "Ask AI", () => {
            this.activateView();
        });

    }

    onunload() {
        if (this.childProcess) {
            // Allow some time for the child process to exit gracefully
            setTimeout(() => {
                this.childProcess.kill();
            }, 500);
        }
    }

    async loadSettings(): Promise<void> {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
    }

    async activateView() {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(AI_VIEW_TYPE);

        if (leaves.length > 0) {
            leaf = leaves[0];
        } else {
            leaf = workspace.getRightLeaf(false);
            


            await leaf.setViewState({ type: AI_VIEW_TYPE, active: true });
        }

        const iconElement = leaf.view.containerEl.querySelector('.leaf-icon');
        if (iconElement) {
            iconElement.src = 'brain-circuit';
        }

        leaf.setIcon(leaf, "brain-circuit");

        workspace.revealLeaf(leaf);
    }


    async expand(): Promise<void> {
        const activeLeaf = this.app.workspace.activeLeaf;
        if (!activeLeaf) return;

        const editor = activeLeaf.view?.editor;
        if (editor) {
            const cursor = editor.getCursor();
            const content = editor.getValue();
            const lines = content.split('\n');
            const lineIndex = Math.min(cursor.line, lines.length - 1);
            const selectedContent = lines.slice(0, lineIndex + 1).join('\n');

            const apiResponse = await this.getAIResponse(selectedContent, cursor, content, editor);

            this.displayMessage('AI wrote into note');
        } else {
            this.displayMessage('No active editor found.');
        }
    }


    displayMessage(message: string): void {
        new Notice(message);
    }

    async getAIResponse(prompt: string, cursor, content, editor) {

        const headers = {
            'accept': 'application/json',
            'Content-Type': 'application/json',
        };

        switch (this.settings.completionProvider) {

        case "groq2":
            // Use Groq API
            const Groq = require("groq-sdk");
            const groq = new Groq({ apiKey: this.settings.groqKey, dangerouslyAllowBrowser: true });

            const sysPrompt = "Continue the user's words. All you do is guess what the user will write next. DO NOT respond as an assistant. DO NOT converse. ONLY guess what the user will write next.";

            const completion = await groq.chat.completions.create({
                    messages: [{ "role": "system", "content": sysPrompt }, 
                        { "role": "user", "content": prompt }],
                    model: this.settings.groqModel,
                    stream: true,
                    stop: "\n\n",
                });

            var lastHope = "";
            for await (const chunk of completion) {
                const offset = editor.posToOffset(cursor);
                lastHope += chunk.choices[0]?.delta?.content;
                var newText = content.substring(0, offset) + lastHope + content.substring(offset);

                if (newText.endsWith("undefined")) {
                    newText = newText.slice(0, -"undefined".length);
                }
                
                editor.setValue(newText); 

            }
            break;



        case "google":


            const imageFileNames: string[] = [];
            const regex = /!\[\[\{(.*?)\}\]\]/g;
            let match: RegExpExecArray | null;

            while ((match = regex.exec(prompt)) !== null) {
                const fileName = match[1];
                imageFileNames.push(fileName);
                prompt = prompt.replace(match[0], '');
            }

            const imageParts = []

            for (const fileName of imageFileNames) {
                // Convert the file extension to lowercase
                const extension = fileName.split('.').pop()?.toLowerCase() || '';
                // Check if it's a variation of JPG
                const fileExtension = extension.includes('jpg') ? 'jpeg' : extension;
                // Log the filename and the path
                imageParts.push(fileToGenerativePart(vaultBasePath+fileName, 'images/' + fileExtension));
            }




            const { GoogleGenerativeAI } = require("@google/generative-ai");
            const genAI = new GoogleGenerativeAI(this.settings.googleKey);
            const model = genAI.getGenerativeModel({ model: "gemini-pro"});
            const result = await model.generateContentStream(prompt);


            function fileToGenerativePart(path, mimeType) {
                return {
                    inlineData: {
                        data: Buffer.from(fs.readFileSync(path)).toString("base64"),
                        mimeType
                    },
                };
            }


            let text = '';

            for await (const chunk of result.stream) {
                const offset = editor.posToOffset(cursor);
                text += chunk.text();

                let newText = content.substring(0, offset) + text + content.substring(offset);
                
                editor.setValue(newText); 
            }

            break;
        



        default:
            
            const OpenAI = require("openai");

            let modelId = "";

            switch (this.settings.completionProvider) {
            case "openai": 
                var openai = new OpenAI({
                    apiKey: this.settings.apiKey,
                    dangerouslyAllowBrowser: true,
                }); 
                modelId = this.settings.openaiCompleteModel;

                
                break;

            case "groq":
                var openai = new OpenAI({
                    apiKey: this.settings.groqKey,
                    baseURL: "https://api.groq.com/openai/v1/",
                    dangerouslyAllowBrowser: true,
                });

                modelId = this.settings.groqModel;
                break;

            case "openrouter":
                var openai = new OpenAI({
                    apiKey: this.settings.openRouterKey,
                    baseURL: "https://openrouter.ai/api/v1",
                    dangerouslyAllowBrowser: true,
                });

                modelId = this.settings.openRouterModel;
                break;


            case "custom":
                var openai = new OpenAI({
                    apiKey: this.settings.apiKey,
                    baseURL: this.settings.customUrl,
                    dangerouslyAllowBrowser: true,
                });

                const models = await openai.models.list();
                modelId = models.data[0].id;
                break;

            default:
                console.log("Error: Invalid completion provider");
                break;
            }


            var afterCurser = content.substring(editor.posToOffset(cursor));

            const stream = await openai.completions.create({
                model: modelId, 
                prompt: prompt,
                suffix: afterCurser,
                stream: true,
                max_tokens: this.settings.maxTokens,
            });

            let lastHope = "";

            for await (const chunk of stream) {
                const offset = editor.posToOffset(cursor);
                lastHope += chunk.choices[0].text;
                let newText = content.substring(0, offset) + lastHope + content.substring(offset);
                
                editor.setValue(newText); 
                editor.setCursor(editor.offsetToPos(offset + lastHope.length));
            }

        }

    }

}
