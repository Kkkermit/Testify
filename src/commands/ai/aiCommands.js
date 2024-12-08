const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ApexChat, ApexImagine, ApexImageAnalyzer } = require('apexify.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('ai')
    .setDescription('Generate AI chat response')
    .addSubcommand(command => command.setName('image-generate').setDescription('Generate AI image').addStringOption(option => option.setName('prompt').setDescription('Prompt for AI image generation').setRequired(true)))
    .addSubcommand(command => command.setName('image-analyser').setDescription('Generate AI response for a summary of an image').addStringOption(option => option.setName('image-url').setDescription('Url for the image you want a summary on').setRequired(true)).addStringOption(option => option.setName("prompt").setDescription("Prompt for AI image analyser").setRequired(false)))
    .addSubcommand(command => command.setName('chat').setDescription('Generate AI chat response').addStringOption(option => option.setName('prompt').setDescription('Prompt for AI chat response').setRequired(true))),
    async execute(interaction, client) {

        interaction.deferReply();
        interaction.channel.sendTyping();

        const sub = interaction.options.getSubcommand();

        switch (sub) {
            case "image-generate":

                const getPromptImage = interaction.options.getString('prompt');

                const model = 'flux-pro';
                const prompt = `${getPromptImage}`;
                const imageOptions = {
                    count: 1,
                    nsfw: false,
                    deepCheck: false,
                    nsfwWords: [],
                    negative_prompt: "",
                    sampler: "DPM++ 2M Karras",
                    height: 512,
                    width: 512,
                    cfg_scale: 9,
                    steps: 20,
                    seed: -1,
                    image_style: "cinematic"
                };

                try {
                    const imageResponse = await ApexImagine(model, prompt, imageOptions);
                    const imageUrl = Array.isArray(imageResponse) ? imageResponse[0] : imageResponse;

                    const embed = new EmbedBuilder()
                    .setAuthor({ name: `AI Image Generation ${client.config.devBy}`})
                    .setTitle(`${client.user.username} AI Image Generation ${client.config.arrowEmoji}`)
                    .setDescription(`**Prompt:** ${prompt}`)
                    .setImage(imageUrl)
                    .setColor(client.config.embedAi)
                    .setFooter({ text: `AI Image generated using ${model} model`})
                    .setTimestamp();

                    await interaction.editReply({ embeds: [embed] });
                } catch (error) {
                    console.log(error);
                    await interaction.editReply({ content: `An error occurred while generating AI image with the prompt: **${prompt}**. Please try again later.`, ephemeral: true });
                }

            break;
            case "image-analyser":

                const getAnalysisPrompt = interaction.options.getString('prompt');
                const getImageUrl = interaction.options.getString('image-url');

                try {
                    const analysisResult = await ApexImageAnalyzer({ imgURL: getImageUrl, getAnalysisPrompt });

                    const embed = new EmbedBuilder()
                    .setAuthor({ name: `AI Image Analyser ${client.config.devBy}`})
                    .setTitle(`${client.user.username} AI Image Analyser ${client.config.arrowEmoji}`)
                    .setDescription(`**Image URL:** ${getImageUrl}\n\n**Image Summary:**\n${analysisResult}`)
                    .setColor(client.config.embedAi)
                    .setFooter({ text: `AI Image Analyser`})
                    .setTimestamp();

                    await interaction.editReply({ embeds: [embed] });
                } catch (error) {
                    console.log(error);
                    await interaction.editReply({ content: `An error occurred while generating AI image-reader response with the URL: **${getImageUrl}** & prompt: **${getAnalysisPrompt}. Please try again later.`, ephemeral: true });
                }

            break;
            case 'chat':

                const getChatPrompt = interaction.options.getString('prompt');

                const chatModel = 'gpt-4o';
                const chatPrompt = `${getChatPrompt}`;
                const chatOptions = {
                    userId: interaction.user.id,
                    memory: false,
                    limit: 0,
                    instruction: 'You are a friendly assistant.',
                };

                try {
                    const chatResponse = await ApexChat(chatModel, chatPrompt, chatOptions);

                    const embed = new EmbedBuilder()
                    .setAuthor({ name: `AI Chat Response ${client.config.devBy}`})
                    .setTitle(`${client.user.username} AI Chat Response ${client.config.arrowEmoji}`)
                    .setDescription(`**Prompt:** ${getChatPrompt}\n\n**Response:**\n${chatResponse}`)
                    .setColor(client.config.embedAi)
                    .setFooter({ text: `AI Chat Response`})
                    .setTimestamp();

                    await interaction.editReply({ embeds: [embed] });
                } catch (error) {
                    console.log(error);
                    await interaction.editReply({ content: `An error occurred while generating AI chat response with the prompt: **${getChatPrompt}**. Please try again later.`, ephemeral: true });
                }

            break;
        }
    }
};
