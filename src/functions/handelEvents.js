const fs = require("fs");

module.exports = (client) => {
	client.handleEvents = async (eventFolders, path) => {
		for (folder of eventFolders) {
			const eventFiles = fs.readdirSync(`${path}/${folder}`).filter((file) => file.endsWith(".js"));
			for (const file of eventFiles) {
				const event = require(`../events/${folder}/${file}`);
				if (event.once) {
					client.once(event.name, (...args) => event.execute(...args, client));
				} else {
					client.on(event.name, (...args) => event.execute(...args, client));
				}
			}
		}
	};
};
