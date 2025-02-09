const axios = require('axios');
const config = require('../config');

const UserUUIDCache = new Map();

const CurrencyEmojis = {
    "85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741": config.valoPoints,
    "85ca954a-41f2-ce94-9b45-8ca3dd39a00d": config.valoKingdomCredits,
    "e59aa87c-4cbf-517a-5983-6e81511be9b7": config.valoRadianite
}

const TierEmojis = {
    "0cebb8be-46d7-c12a-d306-e9907bfc5a25": config.deluxeEdition,
    "e046854e-406c-37f4-6607-19a9ba8426fc": config.exclusiveEdition,
    "60bca009-4182-7998-dee7-b8a2558dc369": config.premiumEdition,
    "12683d76-48d7-84a3-4e09-6985794f0445": config.selectEdition,
    "411e4a55-4e59-7757-41f0-86a53f101bb5": config.ultraEdition
}

class ValoAPI {
    constructor({ accessTokenURL = null, accessToken = null, entitlementToken = null, userUUID = null, SkinsData, SkinsTier, userId = null }) {
        this.accessTokenURL = accessTokenURL;
        this.access_token = accessToken;
        this.entitlement_token = entitlementToken;
        this.user_uuid = userUUID;
        this.userId = userId;
        this.baseURL = 'https://pd.eu.a.pvp.net/';
        this.client_version = null;
        this.headers = null;
        this.skins = SkinsData;
        this.skinsTier = SkinsTier;
    }

    async initialize() {
        if (!this.accessTokenURL && (!this.access_token || !this.entitlement_token)) 
            throw new Error("[ValoApiAuth] No accessTokenURL or access_token || entitlement_token given!");        

        if (!this.client_version) {
            this.client_version = await this.getClientVersion();
        }

        if (this.accessTokenURL) {

            const accessToken = this.accessTokenURL.match(/access_token=([^&]*)/);

            if (accessToken) {
                this.access_token = `${accessToken[1]}`;
            } else {
                throw new Error("[ValoApiAuth] Error invalid access token!");
            }

            await this.#getEntitlementToken();
        }

        this.headers = {
            'Authorization': `Bearer ${this.access_token}`,
            'X-Riot-Entitlements-JWT': this.entitlement_token,
            'X-Riot-ClientPlatform': 'ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIldpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9',
            'Content-Type': 'application/json',
            'X-Riot-ClientVersion' : this.client_version
        }

        if (!this.user_uuid) {
            this.user_uuid = await this.getUserUUID();
        }
    }

    async #getEntitlementToken() {
        const res = await axios.post('https://entitlements.auth.riotgames.com/api/token/v1', {}, {
            headers: {
                Authorization: `Bearer ${this.access_token.toString()}`,
                'Content-Type': 'application/json',
            }
        }).catch((e) => { console.log(e) });

        this.entitlement_token = res.data.entitlements_token;
    }

    async getClientVersion() {
        const res = await axios.get('https://valorant-api.com/v1/version');
        this.client_version = res.data.data.riotClientVersion;

        return this.client_version;
    }

    async getStore() {
        if (!this.user_uuid || !this.access_token || !this.entitlement_token) {
            throw new Error('User UUID is not initialized. Call initialize() first.');
        }

        const res = await axios.post(this.baseURL + 'store/v3/storefront/' + this.user_uuid, {}, {
            headers: this.headers
        });

        const NewStore = Math.floor(Date.now() / 1000) + Number(res.data["SkinsPanelLayout"]["SingleItemOffersRemainingDurationInSeconds"]);
        const StoreSkins = this.#Formater(res.data["SkinsPanelLayout"]["SingleItemStoreOffers"], 'store');

        return { StoreSkins, NewStore };
    }

    async getWallet() {
        if (!this.user_uuid || !this.access_token || !this.entitlement_token) {
            throw new Error('User UUID is not initialized. Call initialize() first.');
        }

        const res = await axios.get(this.baseURL + 'store/v1/wallet/' + this.user_uuid, {
            headers: this.headers
        }).catch((e) => { console.log(e); });
        return this.#Formater(res.data, 'currency');
    }

    async getUserUUID() {
        if (this.user_uuid) return this.user_uuid;

        try {
            const res = await axios.get('https://auth.riotgames.com/userinfo', {
                headers: {
                    Authorization: `Bearer ${this.access_token.toString()}`,
                },
            });

            this.user_uuid = res.data.sub;
            UserUUIDCache.set(this.access_token, this.user_uuid);
            return this.user_uuid;
        } catch (error) {
            console.error('Failed to fetch user UUID:', error);
            throw error;
        }
    }

    getTokens() {
        const access_token = this.access_token;
        const entitlement_token = this.entitlement_token;
        const user_uuid = this.user_uuid;

        return { access_token, entitlement_token, user_uuid };
    }

    #Formater(data, type, separator = ' ') {
        switch (type) {
            case 'currency':
                let Finished = [];

                for (const [key, value] of Object.entries(data.Balances)) { 
                    const Emoji = CurrencyEmojis[key];
                
                    if (!Emoji) continue;
                
                    Finished.push(`${Emoji}: ${value}`);
                }

                return Finished.join(separator);
            break;

            case 'store':
                let Skins = [];

                for (const skin of data) {
                    const foundSkin = this.skins.find(s => s.levels[0].uuid === skin.OfferID);

                    if (!foundSkin) continue;

                    const skinTier = this.skinsTier.find(s => s["uuid"] === foundSkin["contentTierUuid"]);

                    Skins.push({ name: foundSkin["displayName"]["en-US"], icon: foundSkin["levels"][0]["displayIcon"] || foundSkin["displayIcon"], price: `${skin["Cost"]["85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741"]} ${CurrencyEmojis["85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741"]}`, tier: { name: skinTier["displayName"], color: `#${skinTier["highlightColor"].slice(0, -2)}`, emoji: TierEmojis[skinTier["uuid"]] } })
                }

                return Skins;
            break;
        }
    }
}

module.exports = ValoAPI;
