function getSlashCommandsByCategory(client) {
    const categories = {};
    
    client.commands.forEach(command => {
        const category = command.category || "Uncategorized";
        
        if (category === "Owner") return;
        
        if (!categories[category]) {
            categories[category] = [];
        }
        
        let subcommands = [];
        if (command.data && command.data.options) {
            subcommands = command.data.options
                .filter(opt => opt.toJSON().type === 1)
                .map(sub => {
                    return {
                        name: sub.name,
                        description: sub.description
                    };
                });
        }
        
        categories[category].push({
            name: command.data.name,
            description: command.data.description,
            usableInDms: command.usableInDms || false,
            underDevelopment: command.underDevelopment || false,
            subcommands: subcommands
        });
    });
    
    return categories;
}

function getPrefixCommandsByCategory(client) {
    const categories = {};
    
    client.pcommands.forEach(command => {
        const category = command.category || "Uncategorized";
        
        if (category === "Owner") return;
        
        if (!categories[category]) {
            categories[category] = [];
        }
        
        const subcommands = command.subcommands || [];
        
        categories[category].push({
            name: command.name,
            description: command.description || "No description provided",
            usableInDms: command.usableInDms || false,
            aliases: command.aliases || [],
            underDevelopment: command.underDevelopment || false,
            subcommands: subcommands
        });
    });
    
    return categories;
}

function createCommandPages(commands, itemsPerPage = 6, prefix = '') {
    const pages = [];
    
    for (let i = 0; i < commands.length; i += itemsPerPage) {
        const pageCommands = commands.slice(i, i + itemsPerPage);
        pages.push(pageCommands);
    }
    
    return pages;
}

function getCategoryEmoji(category) {
    const emojiMap = {
        "Info": "📚",
        "Community": "👥",
        "Moderation": "🛡️",
        "Fun": "🎮",
        "Economy": "💰",
        "Music": "🎵",
        "AI Commands": "🤖",
        "Utility": "🔧",
        "Settings": "⚙️",
        "Prefix Settings": "🔤",
        "Leveling": "📈",
        "Level and Economy": "💹",
        "Games": "🎲",
        "Mini Games": "🎯",
        "Server Utils": "🔨",
        "Developer": "👨‍💻",
        "Giveaway": "🎁",
        "Instagram": "📸",
        "Spotify": "🎧",
        "Uncategorized": "❓"
    };
    
    return emojiMap[category] || "📌";
}

module.exports = {
    getSlashCommandsByCategory,
    getPrefixCommandsByCategory,
    createCommandPages,
    getCategoryEmoji
};
