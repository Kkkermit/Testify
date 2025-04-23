const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, MessageFlags } = require('discord.js');
const fetch = require('node-fetch');
const { createCanvas, loadImage } = require('canvas');
const { formatPerkName, getDBDPerkWithBackground } = require('../../images');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.isButton()) return;
        
        if (interaction.customId.startsWith('dbd_reroll_')) {
            await interaction.deferUpdate();
            
            const role = interaction.customId.split('_')[2];
            
            try {
                const response = await fetch(`https://dbd.tricky.lol/api/randomperks?role=${encodeURIComponent(role)}`);
                const data = await response.json();
                
                if (!data || Object.keys(data).length === 0) {
                    return interaction.followUp({ 
                        content: `Could not fetch new random ${role} perks. Please try again later.`,
                        flags: MessageFlags.Ephemeral
                    });
                }
                
                const roleEmoji = role === 'survivor' ? '👱' : '🔪';
                const roleColor = role === 'survivor' ? '#3498DB' : '#E74C3C';
                
                try {
                    const canvas = createCanvas(800, 800);
                    const ctx = canvas.getContext('2d');
                    
                    ctx.fillStyle = roleColor === '#3498DB' ? '#1a365d' : '#5c1f1f';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    ctx.font = 'bold 40px Arial';
                    ctx.fillStyle = '#ffffff';
                    ctx.textAlign = 'center';
                    ctx.fillText(`Random ${role.charAt(0).toUpperCase() + role.slice(1)} Perk Build`, 400, 60);
                    
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.beginPath();
                    ctx.moveTo(400, 100);
                    ctx.lineTo(400, 700);
                    ctx.moveTo(100, 400);
                    ctx.lineTo(700, 400);
                    ctx.stroke();
                    
                    const positions = [
                        { x: 200, y: 250 },
                        { x: 600, y: 250 },
                        { x: 200, y: 550 },
                        { x: 600, y: 550 }
                    ];
                    
                    const perks = Object.values(data).slice(0, 4);
                    const perkInfos = [];
                    
                    for (let i = 0; i < perks.length; i++) {
                        const perk = perks[i];
                        
                        let processedDescription = perk.description
                            .replace(/<br>/g, '\n')
                            .replace(/<\/?[^>]+(>|$)/g, '');
                        
                        if (perk.tunables && Array.isArray(perk.tunables)) {
                            perk.tunables.forEach((tunable, idx) => {
                                if (Array.isArray(tunable) && tunable.length > 0) {
                                    const value = tunable[0];
                                    processedDescription = processedDescription.replace(
                                        new RegExp(`\\{${idx}\\}`, 'g'), 
                                        value
                                    );
                                }
                            });
                        }

                        const categoryEmoji = perk.categories && Array.isArray(perk.categories) && perk.categories.length > 0 ? 
                            (perk.categories[0] === 'navigation' ? '🧭' : 
                            perk.categories[0] === 'adaptation' ? '🔄' : 
                            perk.categories[0] === 'support' ? '🤝' : 
                            perk.categories[0] === 'perception' ? '👁️' : '📌') : '📌';
                        
                        perkInfos.push({
                            name: perk.name,
                            description: processedDescription.length > 200 ? 
                                processedDescription.substring(0, 197) + '...' : 
                                processedDescription,
                            category: categoryEmoji,
                            formattedName: formatPerkName(perk.name)
                        });
                        
                        try {
                            const formattedPerkName = formatPerkName(perk.name);
                            const perkWithBg = await getDBDPerkWithBackground(formattedPerkName);
                            
                            if (perkWithBg) {
                                const perkImage = await loadImage(perkWithBg.attachment);
                                
                                const perkSize = 200;
                                ctx.drawImage(
                                    perkImage, 
                                    positions[i].x - perkSize/2, 
                                    positions[i].y - perkSize/2, 
                                    perkSize, 
                                    perkSize
                                );
                                
                                ctx.font = 'bold 20px Arial';
                                ctx.fillStyle = 'white';
                                ctx.textAlign = 'center';
                                ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
                                ctx.shadowBlur = 4;
                                ctx.fillText(perk.name, positions[i].x, positions[i].y + 120);
                                ctx.shadowBlur = 0;
                            } else {
                                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                                ctx.fillRect(positions[i].x - 75, positions[i].y - 75, 150, 150);
                                ctx.font = 'bold 20px Arial';
                                ctx.fillStyle = 'white';
                                ctx.textAlign = 'center';
                                ctx.fillText(perk.name, positions[i].x, positions[i].y);
                            }
                        } catch (imgError) {
                            console.error(`Error drawing perk ${perk.name}:`, imgError);
                            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                            ctx.fillRect(positions[i].x - 75, positions[i].y - 75, 150, 150);
                            ctx.font = 'bold 20px Arial';
                            ctx.fillStyle = 'white';
                            ctx.textAlign = 'center';
                            ctx.fillText(perk.name, positions[i].x, positions[i].y);
                        }
                    }
                    
                    const buffer = canvas.toBuffer('image/png');
                    const collageAttachment = new AttachmentBuilder(buffer);
                    collageAttachment.setName('random_perks_collage.png');
                    
                    const embed = new EmbedBuilder()
                        .setColor(roleColor)
                        .setTitle(`${roleEmoji} Random ${role.charAt(0).toUpperCase() + role.slice(1)} Perks`)
                        .setDescription(`*Here's a new selection of four perks for your ${role} loadout:*`)
                        .setImage('attachment://random_perks_collage.png')
                        .setFooter({ text: '💀 Click the reroll button below to generate new perks • Data by dbd.tricky.lol' })
                        .setTimestamp();
                    
                    perkInfos.forEach((perk, index) => {
                        embed.addFields({
                            name: `${index + 1}. ${perk.category} __${perk.name}__`,
                            value: `*${perk.description}*`,
                            inline: false
                        });
                    });
                    
                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`dbd_reroll_${role}`)
                                .setLabel('🎲 Reroll Perks')
                                .setStyle(ButtonStyle.Primary)
                        );
                    
                    await interaction.editReply({
                        embeds: [embed],
                        components: [row],
                        files: [collageAttachment]
                    });
                    
                } catch (error) {
                    console.error(`Error creating perk collage: ${error}`);
                    
                    const embed = new EmbedBuilder()
                        .setColor(roleColor)
                        .setTitle(`${roleEmoji} Random ${role.charAt(0).toUpperCase() + role.slice(1)} Perks`)
                        .setDescription(`*Here's a new selection of perks for your ${role} loadout:*`)
                        .setFooter({ text: '💀 Click the reroll button below to generate new perks • Data by dbd.tricky.lol' })
                        .setTimestamp();
                    
                    Object.values(data).slice(0, 4).forEach((perk, index) => {
                        let desc = perk.description.replace(/<br>/g, '\n').replace(/<\/?[^>]+(>|$)/g, '');
                        
                        if (perk.tunables && Array.isArray(perk.tunables)) {
                            perk.tunables.forEach((tunable, i) => {
                                if (Array.isArray(tunable) && tunable.length > 0) {
                                    desc = desc.replace(new RegExp(`\\{${i}\\}`, 'g'), tunable[0]);
                                }
                            });
                        }
                        
                        if (desc.length > 200) desc = desc.substring(0, 197) + '...';
                        
                        embed.addFields({
                            name: `${index + 1}. __${perk.name}__`,
                            value: `*${desc}*`,
                            inline: false
                        });
                    });
                    
                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`dbd_reroll_${role}`)
                                .setLabel('🎲 Reroll Perks')
                                .setStyle(ButtonStyle.Primary)
                        );
                    
                    await interaction.editReply({
                        embeds: [embed],
                        components: [row]
                    });
                }
            } catch (error) {
                console.error(`Error in DBD reroll: ${error}`);
                await interaction.followUp({ 
                    content: 'An error occurred while rerolling perks. Please try again later.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    }
};
