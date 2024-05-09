const fs = require('node:fs');

module.exports = function (client) {
	const schemas = fs.readdirSync(`../../src/schemas`).filter(file => file.endsWith(".js"));

	const schemaExports = {};

	for (const file of schemas) {
		const fileName = file.split('.')[0];
		schemaExports[fileName] = require(`../schemas/${file}`);
	}
	client.logs.info("[SCHEMAS] Started loading schemas...")
	client.logs.success(`[SCHEMAS] Loaded ${schemas.length} schemas.`)

	return schemaExports;
}