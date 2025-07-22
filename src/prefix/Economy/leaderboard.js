const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const economySchema = require('../../schemas/economySchema');

module.exports = {
    name: 'leaderboard-economy',
    aliases: ['lb-econ', 'rich', 'top'],
    description: 'View the richest users on the server',
    usableInDms: false,
    usage: '[networth|wallet|bank]',
    category: 'Economy',
    async execute(message, client, args) {
        const { guild } = message;
        const type = args[0]?.toLowerCase() || 'networth';
        
        const validTypes = ['networth', 'wallet', 'bank'];
        if (!validTypes.includes(type)) {
            return message.reply(`Invalid type. Please use one of: ${validTypes.join(', ')}`);
        }
        
        const loadingMsg = await message.reply("Generating leaderboard...");
        
        try {
            
            let users = await economySchema.find({ Guild: guild.id });
            
            
            if (type === 'networth') {
                users.sort((a, b) => (b.Bank + b.Wallet) - (a.Bank + a.Wallet));
            } else if (type === 'wallet') {
                users.sort((a, b) => b.Wallet - a.Wallet);
            } else if (type === 'bank') {
                users.sort((a, b) => b.Bank - a.Bank);
            }
            
            users = users.slice(0, 10);
            
            if (users.length === 0) {
                return loadingMsg.edit("No users found with economy accounts!");
            }
            
            const width = 800;
            const height = 600;
            
            const canvas = createCanvas(width, height);
            const ctx = canvas.getContext('2d');
            
            try {
                let background = null;
                
                const serverIconURL = guild.iconURL({ extension: 'png', size: 1024 });
                
                if (serverIconURL) {
                    
                    background = await loadImage(serverIconURL);
                    
                    ctx.drawImage(background, 0, 0, width, height);
                    
                    ctx.globalAlpha = 0.3;
                    for (let i = -2; i <= 2; i++) {
                        for (let j = -2; j <= 2; j++) {
                            if (i === 0 && j === 0) continue;
                            ctx.drawImage(background, i * 5, j * 5, width, height);
                        }
                    }
                    ctx.globalAlpha = 1.0;
                } else {
                    const gradient = ctx.createLinearGradient(0, 0, 0, height);
                    gradient.addColorStop(0, '#1a1a2e');
                    gradient.addColorStop(1, '#16213e');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(0, 0, width, height);
                }
            } catch (error) {
                console.log("Error loading server icon:", error.message);
                ctx.fillStyle = '#1a1a2e';
                ctx.fillRect(0, 0, width, height);
            }
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, width, height);
            
            try {
                const serverIconURL = guild.iconURL({ extension: 'png', size: 128 });
                if (serverIconURL) {
                    const serverIcon = await loadImage(serverIconURL);
                    const iconSize = 80;
                    
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(width / 2, 50, iconSize / 2, 0, Math.PI * 2);
                    ctx.closePath();
                    ctx.clip();
                    ctx.drawImage(serverIcon, width / 2 - iconSize / 2, 50 - iconSize / 2, iconSize, iconSize);
                    ctx.restore();
                }
            } catch (error) {
                console.log("Error drawing server icon:", error.message);
            }
            
            ctx.font = '40px sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            
            const titleText = {
                'networth': '💰 Richest Users (Net Worth)',
                'wallet': '💵 Richest Users (Wallet)',
                'bank': '🏦 Richest Users (Bank)'
            }[type];
            
            ctx.fillText(titleText, width / 2, 120);
            
            ctx.font = '20px sans-serif';
            ctx.fillText(guild.name, width / 2, 150);
            
            ctx.beginPath();
            ctx.moveTo(50, 170);
            ctx.lineTo(width - 50, 170);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.textAlign = 'left';
            ctx.font = 'bold 24px sans-serif';
            ctx.fillText('Rank', 60, 210);
            ctx.fillText('User', 150, 210);
            ctx.fillText('Balance', width - 200, 210);
            
            const avatarSize = 40;
            const rowHeight = 45;
            const startY = 250;
            
            const userPromises = users.map(async (userData, index) => {
                const rank = index + 1;
                const y = startY + (index * rowHeight);
                let displayName = 'Unknown User';
                let userAvatar = null;
                
                try {
                    const fetchedUser = await client.users.fetch(userData.User);
                    displayName = fetchedUser.username;
                    
                    try {
                        userAvatar = await loadImage(fetchedUser.displayAvatarURL({ extension: 'png', size: 64 }));
                    } catch (avatarError) {
                        console.log("Avatar load error:", avatarError.message);
                    }
                } catch (userError) {
                    console.log("User fetch error:", userError.message);
                }
                
                return { rank, userData, displayName, userAvatar, y };
            });
            
            const userResults = await Promise.all(userPromises);
            
            for (const { rank, userData, displayName, userAvatar, y } of userResults) {
                ctx.beginPath();
                if (rank === 1) {
                    ctx.fillStyle = '#ffd700'; 
                } else if (rank === 2) {
                    ctx.fillStyle = '#c0c0c0';
                } else if (rank === 3) {
                    ctx.fillStyle = '#cd7f32'; 
                } else {
                    ctx.fillStyle = '#4CAF50'; 
                }
                
                ctx.arc(60, y, 15, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = '#000000';
                ctx.font = 'bold 16px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(rank.toString(), 60, y + 5);
                
                ctx.textAlign = 'left';
                
                if (userAvatar) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(130, y, avatarSize / 2, 0, Math.PI * 2);
                    ctx.closePath();
                    ctx.clip();
                    ctx.drawImage(userAvatar, 130 - avatarSize / 2, y - avatarSize / 2, avatarSize, avatarSize);
                    ctx.restore();
                }
                
                ctx.fillStyle = '#ffffff';
                ctx.font = '20px sans-serif';
                ctx.fillText(displayName, 160, y + 5);
                
                let balance;
                if (type === 'networth') {
                    balance = userData.Wallet + userData.Bank;
                } else if (type === 'wallet') {
                    balance = userData.Wallet;
                } else if (type === 'bank') {
                    balance = userData.Bank;
                }
                
                ctx.textAlign = 'right';
                ctx.fillText(`$${balance.toLocaleString()}`, width - 60, y + 5);
                ctx.textAlign = 'left';
            }
            
            ctx.textAlign = 'center';
            ctx.font = '16px sans-serif';
            ctx.fillStyle = '#aaaaaa';
            ctx.fillText(`Use ${client.config.prefix}transfer to send money to other users`, width / 2, height - 30);
            
            const buffer = canvas.toBuffer('image/png');
            const attachment = new AttachmentBuilder(buffer, { name: 'leaderboard.png' });
            
            await loadingMsg.edit({ content: null, files: [attachment] });
            
        } catch (error) {
            console.error('Error generating leaderboard:', error);
            return loadingMsg.edit(`There was an error generating the leaderboard: ${error.message}`);
        }
    }
};
