const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ApexChat, ApexImagine, ApexImageAnalyzer } = require('apexify.js');
const SetupChannel = require('../../schemas/aiChannelSystem');
const filter = require('../../jsons/filter.json');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('ai')
    .setDescription('Generate AI chat response')
    .addSubcommand(command => command.setName('image-generate').setDescription('Generate AI image').addStringOption(option => option.setName('prompt').setDescription('Prompt for AI image generation').setRequired(true)))
    .addSubcommand(command => command.setName('image-analyser').setDescription('Generate AI response for a summary of an image').addStringOption(option => option.setName('image-url').setDescription('Url for the image you want a summary on').setRequired(true)).addStringOption(option => option.setName("prompt").setDescription("Prompt for AI image analyser").setRequired(false)))
    .addSubcommand(command => command.setName('chat').setDescription('Generate AI chat response').addStringOption(option => option.setName('prompt').setDescription('Prompt for AI chat response').setRequired(true)))
    .addSubcommand(command => command.setName('setup-channel').setDescription('Setup AI channel for AI chat response').addChannelOption(option => option.setName('channel').setDescription('Channel to setup AI chat response').setRequired(true)).addStringOption(option => option.setName('ai-instructions').setDescription('Instructions for AI chat response').setRequired(false)))
    .addSubcommand(command => command.setName('disable-channel').setDescription('Disable AI chat response in a channel'))
    .addSubcommand(command => command.setName('update-ai-instructions').setDescription('Update AI instructions for AI chat response').addStringOption(option => option.setName('ai-instructions').setDescription('Instructions for AI chat response').setRequired(true))),
    async execute(interaction, client) {

        await interaction.deferReply();

        const sub = interaction.options.getSubcommand();

        const filterMessage = "The prompt you have entered includes profanity which is **not** allowed. Please try again with a different prompt.";

        switch (sub) {
            case "image-generate":
                await interaction.channel.sendTyping();

                const getPromptImage = interaction.options.getString('prompt');

                const model = `${client.config.aiImageGenModel}`;
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

                    if (imageOptions.nsfw === false && filter.words.includes(prompt)) {
                        await interaction.editReply({ content: `NSFW content has been disabled. Only the owner of the bot can change this. Please try with a different prompt that does not include NSFW content.`, ephemeral: true });
                        return;
                    }

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
                    client.logs.error("[AI_IMAGE_GENERATE] Error occurred in AI Image Generation: ", error);
                }

            break;
            case "image-analyser":
                await interaction.channel.sendTyping();

                const getImageUrl = interaction.options.getString('image-url');
                const getAnalysisPrompt = interaction.options.getString('prompt') || "Analyze this image";

                if (filter.words.includes(getAnalysisPrompt)) {
                    return await interaction.editReply({ content: `${filterMessage}`, ephemeral: true });
                }

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
                    client.logs.error("[AI_IMAGE_ANALYSER] Error occurred in AI Image Analyser: ", error);
                }

            break;
            case 'chat':
                await interaction.channel.sendTyping();

                const getChatPrompt = interaction.options.getString('prompt');

                if (filter.words.includes(getChatPrompt)) {
                    return await interaction.editReply({ content: `${filterMessage}`, ephemeral: true });
                }

                const chatModel = `${client.config.aiChatModel}`;
                const chatPrompt = `${getChatPrompt}`;
                const chatOptions = {
                    userId: interaction.user.id,
                    memory: false,
                    limit: 0,
                    instruction: 'You are a friendly assistant.',
                };

                try {
                    const chatResponse = await ApexChat(chatModel, chatPrompt, chatOptions);

                    if (chatResponse.includes('@here') || chatResponse.includes('@everyone')) {
                        chatResponse = chatResponse.replace(/@here/g, '[here]').replace(/@everyone/g, '[everyone]');
                    }

                    let finalResponse = chatResponse;
                    if (chatResponse.length > 2000) {
                        finalResponse = chatResponse.substring(0, 1997) + '...';
                    }

                    const embed = new EmbedBuilder()
                    .setAuthor({ name: `AI Chat Response ${client.config.devBy}`})
                    .setTitle(`${client.user.username} AI Chat Response ${client.config.arrowEmoji}`)
                    .setDescription(`**Prompt:** ${getChatPrompt}\n\n**Response:**\n${finalResponse}`)
                    .setColor(client.config.embedAi)
                    .setFooter({ text: `AI Chat Response`})
                    .setTimestamp();

                    await interaction.editReply({ embeds: [embed] });
                } catch (error) {
                    console.log(error);
                    await interaction.editReply({ content: `An error occurred while generating AI chat response with the prompt: **${getChatPrompt}**. Please try again later.`, ephemeral: true });
                    client.logs.error("[AI_CHAT_RESPONSE] Error occurred in AI Chat Response: ", error);
                }

            break;
            case 'setup-channel':

                const channel = interaction.options.getChannel('channel');
                const instruction = interaction.options.getString('ai-instructions') || 'You are a friendly assistant.';
                const channelID = channel.id;
                const serverID = interaction.guild.id;

                if (filter.words.includes(instruction)) {
                    return await interaction.editReply({ content: `${filterMessage}`, ephemeral: true });
                }

                const setupChannel = new SetupChannel({ 
                    serverID, 
                    channelID, 
                    instruction 
                });

                await setupChannel.save();

                try {
                    const embed = new EmbedBuilder()
                    .setAuthor({ name: `AI Channel Setup ${client.config.devBy}`})
                    .setTitle(`${client.user.username} AI Channel Setup ${client.config.arrowEmoji}`)
                    .setDescription(`AI chat response has been setup in this channel!`)
                    .addFields({ name: `Channel`, value: `<#${channelID}>`})
                    .addFields({ name: `AI Instructions`, value: `${instruction}`})
                    .setColor(client.config.embedAi)
                    .setFooter({ text: `AI Chat Response Setup`})
                    .setTimestamp();

                    await interaction.editReply({ embeds: [embed] });
                } catch (error) {
                    console.log(error);
                    await interaction.editReply({ content: `An error occurred while setting up AI chat response in this channel. Please try again later.`, ephemeral: true });
                    client.logs.error("[AI_CHANNEL_SETUP] Error occurred in AI Channel Setup: ", error);
                }

            break;
            case 'disable-channel':

                const disableChannel = await SetupChannel.findOneAndDelete({ serverID: interaction.guild.id });

                if (!disableChannel) return await interaction.editReply({ content: `AI chat response has **not** yet been setup in this server!`, ephemeral: true });

                try {
                    const embed = new EmbedBuilder()
                    .setAuthor({ name: `AI Channel Disable ${client.config.devBy}`})
                    .setTitle(`${client.user.username} AI Channel Disable ${client.config.arrowEmoji}`)
                    .setDescription(`AI chat response has been disabled in this server!`)
                    .setColor(client.config.embedAi)
                    .setFooter({ text: `AI Chat Response Disable`})
                    .setTimestamp();

                    await interaction.editReply({ embeds: [embed] });
                } catch (error) {
                    console.log(error);
                    await interaction.editReply({ content: `An error occurred while disabling AI chat response in this channel. Please try again later.`, ephemeral: true });
                    client.logs.error("[AI_CHANNEL_DISABLE] Error occurred in AI Channel Disable: ", error);
                }

            break;
            case 'update-ai-instructions':

                const getInstructions = interaction.options.getString('ai-instructions');

                if (filter.words.includes(getInstructions)) {
                    return await interaction.editReply({ content: `${filterMessage}`, ephemeral: true });
                }

                const updateInstructions = await SetupChannel.findOneAndUpdate({ serverID: interaction.guild.id }, { instruction: getInstructions });

                if (!updateInstructions) return await interaction.editReply({ content: `AI chat response has **not** yet been setup in this server!`, ephemeral: true });

                try {
                    const embed = new EmbedBuilder()
                    .setAuthor({ name: `AI Channel Update ${client.config.devBy}`})
                    .setTitle(`${client.user.username} AI Channel Update ${client.config.arrowEmoji}`)
                    .setDescription(`AI chat response instructions have been updated in this server!`)
                    .addFields({ name: `AI Instructions`, value: `${getInstructions}`})
                    .setColor(client.config.embedAi)
                    .setFooter({ text: `AI Chat Response Update`})
                    .setTimestamp();

                    await interaction.editReply({ embeds: [embed] });
                } catch (error) {
                    console.log(error);
                    await interaction.editReply({ content: `An error occurred while updating AI chat response instructions in this channel. Please try again later.`, ephemeral: true });
                    client.logs.error("[AI_CHANNEL_UPDATE] Error occurred in AI Channel Update: ", error);
                }
                
            break;
        }
    }
};
