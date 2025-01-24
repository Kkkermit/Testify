module.exports = (client) => {
    client.handleTriggers = async (triggerFiles, path) => {
        for (const file of triggerFiles) {
            const trigger = require(`../triggers/${file}`);
            if (trigger.once) {
                client.once(trigger.name, (...args) => trigger.execute(...args, client));
            } else {
                client.on(trigger.name, (...args) => trigger.execute(...args, client));
            }
        }
    };
}