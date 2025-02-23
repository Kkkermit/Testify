const fetch = require('node-fetch');

async function fetchValorantAPI(client) {
    const skinsData = await fetch("https://valorant-api.com/v1/weapons/skins?language=all");
    if (skinsData.status !== 200) {
        client.logs.error(`[VAL_API] Failed to fetch skins from API!`);
    }
    const skinsJson = await skinsData.json();

    const tierData = await fetch("https://valorant-api.com/v1/contenttiers/");
    if (tierData.status !== 200) {
        client.logs.error(`[VAL_API] Failed to fetch skins from API!`);
    }
    const tierJson = await tierData.json();

    for (const Tier of tierJson["data"]) {
        switch (Tier.uuid) {
            case "12683d76-48d7-84a3-4e09-6985794f0445": Tier.price = 875; break;
            case "0cebb8be-46d7-c12a-d306-e9907bfc5a25": Tier.price = 1275; break;
            case "60bca009-4182-7998-dee7-b8a2558dc369": Tier.price = 1775; break;
            case "e046854e-406c-37f4-6607-19a9ba8426fc": Tier.price = 2175; break;
            case "411e4a55-4e59-7757-41f0-86a53f101bb5": Tier.price = 2475; break;
            default: Tier.price = 0; break;
        }
    }
	const swatchData = await fetch("https://api.arnsfh.xyz/v1/valorant/data/swatch");

	if (swatchData.status !== 200) {
		client.logs.error(`[VAL_API] Failed to fetch swatch data from API!`);
	} 

	const swatchJson = await swatchData.json();

	client.swatch = swatchJson;
    client.skins = skinsJson["data"];
    client.skinsTier = tierJson["data"];

    client.logs.info(`[VAL_API] Fetched ${skinsJson["data"].length} skins from API.`);
    client.logs.info(`[VAL_API] Fetched ${tierJson["data"].length} tiers from API.`);
    client.logs.info(`[VAL_API] Fetched ${swatchJson.length} swatches from API.`);
}

module.exports = { fetchValorantAPI };
