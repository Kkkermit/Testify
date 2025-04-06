const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionsBitField,
    AutoModerationRuleTriggerType,
    AutoModerationRuleEventType,
    AutoModerationRuleKeywordPresetType,
    AutoModerationActionType,
} = require("discord.js");

const linkRegexes = [
    "http[s]?://",            
    "www\\.",                 
    "\\.com",                
    "\\.net",              
    "\\.org",               
    "discord\\.gg",           
    "discord\\.com/invite",   
    "t\\.me",                 
    "instagram\\.com",      
    "youtu(be\\.com|\\.be)"  
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("automod")
        .setDescription("Setup the automod system.")
        .addSubcommand(command =>
            command
                .setName("flagged-words")
                .setDescription("Block profanity and slurs from being used.")
        )
        .addSubcommand(command =>
            command
                .setName("spam-messages")
                .setDescription("Block messages from being spammed.")
        )
        .addSubcommand(command =>
            command
                .setName("mention-spam")
                .setDescription("Block a certain amount of mentions from being used.")
                .addIntegerOption(option =>
                    option
                        .setName("number")
                        .setDescription("The number of mentions required to be blocked.")
                        .setRequired(true)
                )
        )
        .addSubcommand(command =>
            command
                .setName("keyword")
                .setDescription("Block a keyword from being used.")
                .addStringOption(option =>
                    option
                        .setName("word")
                        .setDescription("The word you want to be blocked.")
                        .setRequired(true)
                )
        )
        .addSubcommand(command =>
            command
                .setName("anti-link")
                .setDescription("Block all types of links from being sent.")
        ),

    run: async({interaction}) => {
        const { guild, options } = interaction;
        const sub = options.getSubcommand();

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({
                content: "<:deny:1296597754713215057> You need to be an administrator to use this command.",
                flags: 64,
            });
        }

        let ruleData;
        let embedColor;
        let ruleDescription;
        
        switch (sub) {
            case "flagged-words":
                ruleData = {
                    name: "AutoMod: Profanity Filter",
                    creatorId: interaction.client.user.id,
                    enabled: true,
                    eventType: AutoModerationRuleEventType.MessageSend,
                    triggerType: AutoModerationRuleTriggerType.KeywordPreset,
                    triggerMetadata: {
                        presets: [
                            AutoModerationRuleKeywordPresetType.Profanity,
                            AutoModerationRuleKeywordPresetType.SexualContent,
                            AutoModerationRuleKeywordPresetType.Slurs,
                        ],
                    },
                    actions: [{ type: AutoModerationActionType.BlockMessage }],
                };
                embedColor = "#FF5555";
                ruleDescription = "Messages containing profanity, sexual content, or slurs will be automatically blocked.";
                break;

            case "spam-messages":
                ruleData = {
                    name: "AutoMod: Spam Filter",
                    creatorId: interaction.client.user.id,
                    enabled: true,
                    eventType: AutoModerationRuleEventType.MessageSend,
                    triggerType: AutoModerationRuleTriggerType.Spam,
                    triggerMetadata: {},
                    actions: [{ type: AutoModerationActionType.BlockMessage }],
                };
                embedColor = "#FFA500";
                ruleDescription = "Repeated messages that look like spam will be automatically blocked.";
                break;

            case "mention-spam":
                const number = options.getInteger("number");
                ruleData = {
                    name: "AutoMod: Mention Spam",
                    creatorId: interaction.client.user.id,
                    enabled: true,
                    eventType: AutoModerationRuleEventType.MessageSend,
                    triggerType: AutoModerationRuleTriggerType.MentionSpam,
                    triggerMetadata: {
                        mentionTotalLimit: number,
                    },
                    actions: [{ type: AutoModerationActionType.BlockMessage }],
                };
                embedColor = "#FFD700";
                ruleDescription = `Messages containing more than ${number} mentions will be automatically blocked.`;
                break;

            case "keyword":
                const word = options.getString("word");
                ruleData = {
                    name: `AutoMod: Block '${word}'`,
                    creatorId: interaction.client.user.id,
                    enabled: true,
                    eventType: AutoModerationRuleEventType.MessageSend,
                    triggerType: AutoModerationRuleTriggerType.Keyword,
                    triggerMetadata: {
                        keywordFilter: [word],
                    },
                    actions: [{ type: AutoModerationActionType.BlockMessage }],
                };
                embedColor = "#9370DB";
                ruleDescription = `Messages containing the word "${word}" will be automatically blocked.`;
                break;

            case "anti-link":
                ruleData = {
                    name: "AutoMod: Anti-Link",
                    creatorId: interaction.client.user.id,
                    enabled: true,
                    eventType: AutoModerationRuleEventType.MessageSend,
                    triggerType: AutoModerationRuleTriggerType.Keyword,
                    triggerMetadata: {
                        regexPatterns: linkRegexes,
                    },
                    actions: [{ type: AutoModerationActionType.BlockMessage }],
                };
                embedColor = "#4169E1";
                ruleDescription = "Messages containing links will be automatically blocked.";
                break;

            default:
                return interaction.reply({ content: "<:deny:1296597754713215057> Invalid subcommand!", flags: 64 });
        }

        try {
            await guild.autoModerationRules.fetch();
            let existingRule = null;
            
            switch (sub) {
                case "flagged-words":
                    existingRule = guild.autoModerationRules.cache.find(
                        r => r.triggerType === AutoModerationRuleTriggerType.KeywordPreset &&
                             r.enabled
                    );
                    break;
                    
                case "spam-messages":
                    existingRule = guild.autoModerationRules.cache.find(
                        r => r.triggerType === AutoModerationRuleTriggerType.Spam &&
                             r.enabled
                    );
                    break;
                    
                case "mention-spam": 
                    const mentionLimit = options.getInteger("number");
                    existingRule = guild.autoModerationRules.cache.find(
                        r => r.triggerType === AutoModerationRuleTriggerType.MentionSpam &&
                             r.triggerMetadata.mentionTotalLimit === mentionLimit &&
                             r.enabled
                    );
                    break;
                    
                case "keyword":
                    const keyword = options.getString("word").toLowerCase();
                    existingRule = guild.autoModerationRules.cache.find(
                        r => r.triggerType === AutoModerationRuleTriggerType.Keyword &&
                             r.triggerMetadata.keywordFilter &&
                             r.triggerMetadata.keywordFilter.some(k => k.toLowerCase() === keyword) &&
                             r.enabled
                    );
                    break;
                    
                case "anti-link":
                    existingRule = guild.autoModerationRules.cache.find(
                        r => r.triggerType === AutoModerationRuleTriggerType.Keyword &&
                             r.triggerMetadata.regexPatterns &&
                             r.triggerMetadata.regexPatterns.some(pattern => 
                                 linkRegexes.includes(pattern)
                             ) &&
                             r.enabled
                    );
                    break;
            }

            if (existingRule) {
                const errorEmbed = new EmbedBuilder()
                    .setDescription(`<:warn:1280697574906658909> A similar rule is already active in this server.\n\nExisting Rule: **${existingRule.name}**`)
                    .setColor("#FF7F50")
                    .setFooter({ text: `Requested by ${interaction.user.tag}` })
                    .setTimestamp();
                
                return interaction.reply({
                    embeds: [errorEmbed],
                    flags: 64,
                });
            }

            await guild.autoModerationRules.create({
                name: ruleData.name,
                creatorId: ruleData.creatorId,
                enabled: ruleData.enabled,
                eventType: ruleData.eventType,
                triggerType: ruleData.triggerType,
                triggerMetadata: ruleData.triggerMetadata,
                actions: ruleData.actions,
                reason: `Created by ${interaction.user.tag}`,
            });
            const currentTimestamp = Math.floor(Date.now() / 1000);
            const discordTimestamp = `<t:${currentTimestamp}:R>`;
            
            const successEmbed = new EmbedBuilder()
                .setDescription(`<:approved:1356438146400780409> **${ruleData.name}**\n\n${ruleDescription}`)
                .setColor(embedColor)
                .addFields(
                    { name: "Created By", value: `<@${interaction.user.id}>`, inline: true },
                    { name: "Time Created", value: discordTimestamp, inline: true },
                    { name: "Status", value: "Active", inline: true }
                )
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                .setFooter({ text: `Server Protection • ${interaction.guild.name}` })
                .setTimestamp();

            interaction.reply({ embeds: [successEmbed] });
        } catch (err) {
            console.error(err);
            
            const errorEmbed = new EmbedBuilder()
                .setDescription(`<:deny:1296597754713215057> Failed to create the AutoMod rule. Please check the bot's permissions and try again.`)
                .setColor("#FF0000")
                .addFields(
                    { name: "Error Details", value: `\`\`\`${err.message || "Unknown error"}\`\`\`` }
                )
                .setFooter({ text: `Server: ${interaction.guild.name}` })
                .setTimestamp();
                
            interaction.reply({
                embeds: [errorEmbed],
                flags: 64,
            });
        }
    },
};
