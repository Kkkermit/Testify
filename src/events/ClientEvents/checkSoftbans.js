const { Events } = require('discord.js');
const SoftbanEntry = require('../../schemas/softbanSystem');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        client.logs.info('[SOFTBAN] Starting softban check system');

        if (!client.modPanels) {
            client.modPanels = new Map();
            client.logs.info('[MOD_PANEL] Initialized moderation panels cache from softban checker');
        }
        
        let lastCheckHadResults = false;
        let checkCount = 0;
        
        async function checkSoftbans() {
            try {
                checkCount++;
                
                const now = new Date();
                const expiredSoftbans = await SoftbanEntry.find({
                    expiresAt: { $lte: now },
                    isActive: true
                });
                
                if (expiredSoftbans.length > 0) {
                    lastCheckHadResults = true;
                } else if (lastCheckHadResults || checkCount % 60 === 0) {
                    lastCheckHadResults = false;
                }
                
                for (const softban of expiredSoftbans) {
                    try {
                        const guild = client.guilds.cache.get(softban.guildId);
                        if (!guild) {
                            softban.isActive = false;
                            await softban.save();
                            continue;
                        }
                        
                        await guild.members.unban(
                            softban.userId, 
                            `[AUTOMATED] Temporary softban expired. Original reason: ${softban.reason}`
                        ).catch(error => {
                            if (error.code === 10026) {
                                client.logs.info(`[SOFTBAN] User ${softban.userId} is already unbanned from guild ${softban.guildId}`);
                            } else {
                                client.logs.error(`[SOFTBAN] Error unbanning user ${softban.userId} from guild ${softban.guildId}: ${error.message}`);
                            }
                        });
                        
                        softban.isActive = false;
                        await softban.save();
                        
                    } catch (error) {
                        client.logs.error(`[SOFTBAN] Error processing softban ${softban._id}: ${error.message}`);
                        
                        if (error.code === 10026) {
                            softban.isActive = false;
                            await softban.save();
                        }
                    }
                }
            } catch (error) {
                client.logs.error(`[SOFTBAN] Error in softban check routine: ${error.message}`);
            }
            
            setTimeout(checkSoftbans, 60000);
        }
        
        checkSoftbans();
    }
};
