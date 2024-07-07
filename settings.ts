import { PluginSettingTab, App, Setting } from 'obsidian';
import askAIPlugin from './main';

export class askAISettingTab extends PluginSettingTab {
  plugin: askAIPlugin;

  constructor(app: App, plugin: askAIPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h1", { text: "Chat With Notes Settings" });

    containerEl.createEl("br", { text: "" });

    new Setting(containerEl)
      .setName('Chat Provider')
      .setDesc('Select the provider for AI completions')
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            openrouter: 'Open Router',
            groq: 'Groq',
            google: 'Google',
            openai: 'OpenAI',
            cloudflare: "Cloudflare",
            custom: 'Custom',
          })
          .setValue(this.plugin.settings.chatProvider || 'cloudflare')
          .onChange(async (value) => {
            this.plugin.settings.chatProvider = value;
            await this.plugin.saveSettings();
          })
      );



    new Setting(containerEl)
      .setName('Completion Provider')
      .setDesc('Select the provider for AI completions')
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            openrouter: 'Open Router',
            //groq: 'Groq',
            google: 'Google',
            openai: 'OpenAI',
            cloudflare: "Cloudflare",
            custom: 'Custom',
          })
          .setValue(this.plugin.settings.completionProvider || 'google')
          .onChange(async (value) => {
            this.plugin.settings.completionProvider = value;
            await this.plugin.saveSettings();
          })
      );

    containerEl.createEl("br", { text: "" });


    const openRouterSection = containerEl.createEl('details');
    const orsummaryEl = openRouterSection.createEl('summary');
    orsummaryEl.createEl('strong', { text: 'Open Router Settings' });

    const openRouterSettingsContainer = openRouterSection.createEl('div');

    openRouterSettingsContainer.createEl("br", { text: "" });

    new Setting(openRouterSettingsContainer)
      .setName('Open Router API Key')
      .setDesc('Enter your free API key for Open Router, found here https://openrouter.io/')
      .addText((text) =>
        text
          .setPlaceholder('')
          .setValue(this.plugin.settings.openRouterKey)
          .onChange(async (value) => {
            this.plugin.settings.openRouterKey = value;
            await this.plugin.saveSettings();
          })
      );


    new Setting(openRouterSettingsContainer)
      .setName('Open Router Model')
      .setDesc('Enter a model')
      .addText((text) =>
        text
          .setPlaceholder('microsoft/phi-3-medium-128k-instruct:free')
          .setValue(this.plugin.settings.openRouterModel || 'microsoft/phi-3-medium-128k-instruct:free')
          .onChange(async (value) => {
            this.plugin.settings.openRouterModel = value;
            await this.plugin.saveSettings();
          })
      );


    containerEl.createEl("br", { text: "" });



    const groqSection = containerEl.createEl('details');
    const summaryEl = groqSection.createEl('summary');
    summaryEl.createEl('strong', { text: 'Groq Settings' });
    containerEl.createEl("br", { text: "" });
    const groqSettingsContainer = groqSection.createEl('div');

    groqSettingsContainer.createEl("br", { text: "" });


    new Setting(groqSettingsContainer)
      .setName('Groq API Key')
      .setDesc('Enter your free API key for Groq, found here https://console.groq.com/keys')
      .addText((text) =>
        text
          .setPlaceholder('')
          .setValue(this.plugin.settings.groqKey)
          .onChange(async (value) => {
            this.plugin.settings.groqKey = value;
            await this.plugin.saveSettings();
          })
      );


    new Setting(groqSettingsContainer)
      .setName('Groq Model')
      .setDesc('Select a model')
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            "gemma-7b-it": 'Gemma 7b',
            "gemma2-9b-it": 'Gemma2 9b',
            "llama3-70b-8192": 'Llama 3 70b',
            "llama3-8b-8192": 'Llama 3 8b',
            "mixtral-8x7b-32768": 'Mixtral 8x7b',
          })
          .setValue(this.plugin.settings.groqModel || "llama3-8b-8192")
          .onChange(async (value) => {
            this.plugin.settings.groqModel = value;
            await this.plugin.saveSettings();
            console.log(this.plugin.settings.groqModel);
          })
      );
      

      const googleSection = containerEl.createEl('details');
      const gsummaryEl = googleSection.createEl('summary');
      gsummaryEl.createEl('strong', { text: 'Google Settings' });

      const googleSettingsContainer = googleSection.createEl('div');

      googleSettingsContainer.createEl("br", { text: "" });



      new Setting(googleSettingsContainer)
      .setName('Google API Key')
      .setDesc('Enter your free API key for Google, found here https://aistudio.google.com/app/apikey')
      .addText((text) =>
        text
          .setPlaceholder('')
          .setValue(this.plugin.settings.googleKey)
          .onChange(async (value) => {
            this.plugin.settings.googleKey = value;
            await this.plugin.saveSettings();
          })
      );

      new Setting(googleSettingsContainer)
      .setName('Vision')
      .setDesc('Let the AI see images in your notes - in development, not working yet')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.googleVis || false)
          .onChange((value) => {
            this.plugin.settings.googleVis = value;
            this.plugin.saveSettings();
          })
      );




      containerEl.createEl("br", { text: "" });
      const openaiSection = containerEl.createEl('details');
      const osummaryEl = openaiSection.createEl('summary');
      osummaryEl.createEl('strong', { text: 'OpenAI Settings' });

      const openaiSettingsContainer = openaiSection.createEl('div');

      openaiSettingsContainer.createEl("br", { text: "" });

      new Setting(openaiSettingsContainer)
      .setName('OpenAI API Key')
      .setDesc('Enter your paid API key for OpenAI, found here https://platform.openai.com/account/api-keys')
      .addText((text) =>
        text
          .setPlaceholder('')
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = value;
            await this.plugin.saveSettings();
          })
      );


      new Setting(openaiSettingsContainer)
      .setName('Chat Model')
      .setDesc('Select your OpenAI model for chat')
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            "gpt-3.5-turbo": 'GPT 3.5 Turbo',
            "gpt-4-turbo": 'GPT 4 Turbo',
            "gpt-4o": 'GPT 4o',
          })
          .setValue(this.plugin.settings.openaiChatModel || 'gpt-3.5-turbo')
          .onChange(async (value) => {
            this.plugin.settings.openaiChatModel = value;
            await this.plugin.saveSettings();
          })
      );


      new Setting(openaiSettingsContainer)
      .setName('Though Finishing Model')
      .setDesc('Select your OpenAI model for thought finishing')
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            "gpt-3.5-turbo-instruct": 'GPT 3.5 turbo',
            "davinci-002": 'Davinci',
            "babbage-002": 'Babbage',
          })
          .setValue(this.plugin.settings.openaiCompleteModel || 'gpt-3.5-turbo')
          .onChange(async (value) => {
            this.plugin.settings.openaiCompleteModel = value;
            await this.plugin.saveSettings();
          })
      );








      containerEl.createEl("br", { text: "" });
      const cloudflareSection = containerEl.createEl('details');
      const cfsummaryEl = cloudflareSection.createEl('summary');
      cfsummaryEl.createEl('strong', { text: 'Cloudflare Settings' });

      const cloudflareSettingsContainer = cloudflareSection.createEl('div');

      cloudflareSettingsContainer.createEl("br", { text: "" });

      new Setting(cloudflareSettingsContainer)
      .setName('Account ID')
      .setDesc('Enter your free Cloudflare Account ID, found here https://dash.cloudflare.com/profile/api-tokens')
      .addText((text) =>
        text
          .setPlaceholder('')
          .setValue(this.plugin.settings.cloudflareID)
          .onChange(async (value) => {
            this.plugin.settings.cloudflareID = value;
            await this.plugin.saveSettings();
          })
      );


      new Setting(cloudflareSettingsContainer)
      .setName('API Key')
      .setDesc('Enter your free Cloudflare API Key')
      .addText((text) =>
        text
          .setPlaceholder('')
          .setValue(this.plugin.settings.cloudflareKey)
          .onChange(async (value) => {
            this.plugin.settings.cloudflareKey = value;
            await this.plugin.saveSettings();
          })
      );


      new Setting(cloudflareSettingsContainer)
      .setName('Enter Model')
      .setDesc("Enter a huggingface model name, check cloudflare's dev docs for options")
      .addText((text) =>
        text
          .setPlaceholder('thebloke/zephyr-7b-beta-awq')
          .setValue(this.plugin.settings.cloudflareModel)
          .onChange(async (value) => {
            this.plugin.settings.cloudflareModel = value;
            await this.plugin.saveSettings();
          })
      );





      containerEl.createEl("br", { text: "" });
      const customSection = containerEl.createEl('details');
      const csummaryEl = customSection.createEl('summary');
      csummaryEl.createEl('strong', { text: 'Custom/Local Settings' });
      containerEl.createEl("br", { text: "" });
      containerEl.createEl("br", { text: "" });
      const customSettingsContainer = customSection.createEl('div');

      customSettingsContainer.createEl("br", { text: "" });



      new Setting(customSettingsContainer)
        .setName('Custom API URL')
        .setDesc("Enter the url for your backend's openAI compatible API, ends with /v1")
        .addText((text) =>
          text
            .setPlaceholder('http://localhost:5001/v1')
            .setValue(this.plugin.settings.customUrl)
            .onChange(async (value) => {
              this.plugin.settings.customUrl = value;
              await this.plugin.saveSettings();
            })
        );


      new Setting(customSettingsContainer)
        .setName('Max Tokens for Thought finishing')
        .setDesc('Set the maximum number of tokens the custom model will write when finishing your thoughts.')
        .addText((text) =>
          text
            .setPlaceholder('192')
            .setValue(this.plugin.settings.maxTokens.toString())
            .onChange(async (value) => {
              const parsedValue = parseInt(value, 10);
              this.plugin.settings.maxTokens = isNaN(parsedValue) ? 512 : parsedValue;
              await this.plugin.saveSettings();
            })
        );



      const embeddingsSection = containerEl.createEl('details');
      const esummaryEl = embeddingsSection.createEl('summary');
      esummaryEl.createEl('strong', { text: 'Embeddings Settings' });

      const embeddingsSettingsContainer = embeddingsSection.createEl('div');

      embeddingsSettingsContainer.createEl("br", { text: "" });



      new Setting(embeddingsSettingsContainer)
      .setName('Embeddings Provider')
      .setDesc('Select your embeddins provider, I reccomend not changing this often')
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            google: 'Google',
            jina: 'Jina.ai',
          })
          .setValue(this.plugin.settings.embeddingsProvider || 'google')
          .onChange(async (value) => {
            this.plugin.settings.embeddingsProvider = value;
            await this.plugin.saveSettings();
          })
      );



  }
}
