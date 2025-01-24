const Logs = require('discord-logs'); 

function auditLogsClient(client) {
    Logs(client, {
        debug: true
    });
}

module.exports = auditLogsClient;