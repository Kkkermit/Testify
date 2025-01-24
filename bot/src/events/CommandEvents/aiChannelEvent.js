const { Events } = require('discord.js');
const SetupChannel = require('../../schemas/aiChannelSystem');
const { ApexChat } = require('apexify.js');
const filter = require('../../jsons/filter.json');

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {

        if (message.author.bot) return;

        const botMentioned = message.content.includes(`<@${client.user.id}>`);
        const isReplyToBot = message.reference && (await message.fetchReference()).author.id === client.user.id;

        if (!botMentioned && !isReplyToBot) return;
        if (filter.words.includes(message.content)) return message.reply({ content: `Woah! Your message includes profanity which is **not** allowed! Try sending your message again but this time, without the need of using that language.`});
        
        const setupChannel = await SetupChannel.findOne({ channelID: message.channel.id });
        if (!setupChannel) return;

        const { instruction } = setupChannel;

        const chatModel = `${client.config.aiChatChannelModel}`;
        const chatPrompt = `${message.content}`;
        const chatOptions = {
            userId: `${message.author.id}-${message.guild.id}`,
            memory: true,
            limit: 12,
            instruction: `${instruction}`,
        };

        try {
            await message.channel.sendTyping();

            const chatResponse = await ApexChat(chatModel, chatPrompt, chatOptions);

            if (!chatResponse || chatResponse.trim().length === 0) {
                client.logs.error(`[AI_CHANNEL_EVENT] Received an empty response from the AI for prompt: ${chatPrompt}. Check the endpoint is active/ the prompt is valid.`);
                await message.reply('The AI **did not** return a response. Please try again with a different prompt.');
                return;
            }

            if (chatResponse.includes('@here') || chatResponse.includes('@everyone')) {
                chatResponse = chatResponse.replace(/@here/g, '[here]').replace(/@everyone/g, '[everyone]');
            }

            if (chatResponse.length > 1995) {
                const truncatedResponse = chatResponse.substring(0, 1995) + '...';
                await message.reply(truncatedResponse);
            } else {
                await message.reply(chatResponse);
            }
        } catch (error) {
            console.error(error);
            await message.reply('An error occurred while generating the AI response. Please try again later.');
            client.logs.error(`[AI_CHANNEL_EVENT] Error occurred in AI Channel Event with prompt: ${chatPrompt}`);
        }
    },
};