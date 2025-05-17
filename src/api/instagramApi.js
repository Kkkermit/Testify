const fetch = require('node-fetch');
const { color, getTimestamp } = require('../utils/loggingEffects');

class InstagramAPI {
    constructor() {
        this.USER_AGENTS = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:111.0) Gecko/20100101 Firefox/111.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:111.0) Gecko/20100101 Firefox/111.0',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/122.0.2365.92',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
        ];

        this.IG_APP_ID = '936619743392459';

        this.browserSignatures = [
            {
                appId: this.IG_APP_ID,
                deviceId: this.generateUUID(),
                asbdId: '198387',
                csrfToken: this.generateRandomString(32),
            },
            {
                appId: this.IG_APP_ID,
                deviceId: this.generateUUID(),
                asbdId: '198387',
                csrfToken: this.generateRandomString(32),
            },
        ];

        this.sessionManager = {
            cookies: {},
            lastRefresh: {},
            activeSignatures: {},
            
            getCookies: (username) => {
                const now = Date.now();
                if (!this.sessionManager.cookies[username] || now - (this.sessionManager.lastRefresh[username] || 0) > 3 * 60 * 60 * 1000) {
                    if (!this.sessionManager.activeSignatures[username]) {
                        this.sessionManager.activeSignatures[username] = this.browserSignatures[Math.floor(Math.random() * this.browserSignatures.length)];
                    }
                    
                    this.sessionManager.cookies[username] = this.generateRealisticCookies(this.sessionManager.activeSignatures[username]);
                    this.sessionManager.lastRefresh[username] = now;
                    
                    if (this.logRateLimiter.shouldLog(`session_refresh_${username}`, 60)) {}
                }
                return this.sessionManager.cookies[username];
            },
            
            refreshCookie: (username) => {
                delete this.sessionManager.cookies[username];
                delete this.sessionManager.lastRefresh[username];
                
                const otherSignatures = this.browserSignatures.filter(sig => 
                    sig.deviceId !== this.sessionManager.activeSignatures[username]?.deviceId
                );
                
                if (otherSignatures.length > 0) {
                    this.sessionManager.activeSignatures[username] = otherSignatures[Math.floor(Math.random() * otherSignatures.length)];
                } else {
                    this.sessionManager.activeSignatures[username] = {
                        appId: this.IG_APP_ID,
                        deviceId: this.generateUUID(),
                        asbdId: '198387',
                        csrfToken: this.generateRandomString(32),
                    };
                }
                
                return this.sessionManager.getCookies(username);
            }
        };

        this.rateLimiter = {
            calls: {},
            lastWarning: {},
            
            checkLimit: (username) => {
                const now = Date.now();
                if (!this.rateLimiter.calls[username]) {
                    this.rateLimiter.calls[username] = [];
                }
        
                this.rateLimiter.calls[username] = this.rateLimiter.calls[username].filter(time => now - time < 15 * 60 * 1000);
                if (this.rateLimiter.calls[username].length >= 10) {
                    const lastWarningTime = this.rateLimiter.lastWarning[username] || 0;
                    if (now - lastWarningTime > 30 * 60 * 1000) {
                        console.warn(`${color.yellow}[${getTimestamp()}] [INSTA_API] Rate limiting API calls for ${username}${color.reset}`);
                        this.rateLimiter.lastWarning[username] = now;
                    }
                    return false;
                }
                this.rateLimiter.calls[username].push(now);
                return true;
            }
        };

        this.logRateLimiter = {
            lastLogs: {},
            
            shouldLog: (key, minutes = 30) => {
                const now = Date.now();
                const lastLog = this.logRateLimiter.lastLogs[key] || 0;
                
                if (now - lastLog > minutes * 60 * 1000) {
                    this.logRateLimiter.lastLogs[key] = now;
                    return true;
                }
                return false;
            }
        };

        this.authStrategies = {
            success: {},
            failures: {}
        };
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    generateRandomString(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    getRandomUserAgent() {
        return this.USER_AGENTS[Math.floor(Math.random() * this.USER_AGENTS.length)];
    }

    generateRealisticCookies(signature) {
        const now = Date.now();
        const futureDate = new Date(now + 90 * 24 * 60 * 60 * 1000).toUTCString();
        
        return [
            `ig_did=${signature.deviceId}; expires=${futureDate}; path=/; secure; HttpOnly`,
            `csrftoken=${signature.csrfToken}; expires=${futureDate}; path=/; secure`,
            `mid=${this.generateRandomString(26)}; expires=${futureDate}; path=/; secure; HttpOnly`,
            `ig_nrcb=1; expires=${futureDate}; path=/; secure`,
            `datr=${this.generateRandomString(24)}; expires=${futureDate}; path=/; secure; HttpOnly`,
        ].join('; ');
    }

    createInstagramHeaders(username, authLevel = 'standard') {
        const cookies = this.sessionManager.getCookies(username);
        const signature = this.sessionManager.activeSignatures[username];
        
        const baseHeaders = {
            'User-Agent': this.getRandomUserAgent(),
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Origin': 'https://www.instagram.com',
            'Referer': `https://www.instagram.com/${username}/`,
            'Connection': 'keep-alive',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Dest': 'empty',
            'Cookie': cookies
        };
        
        if (authLevel === 'guest' || authLevel === 'minimal') {
            return {
                ...baseHeaders,
                'X-IG-App-ID': signature.appId
            };
        } else {
            return {
                ...baseHeaders,
                'X-IG-App-ID': signature.appId,
                'X-ASBD-ID': signature.asbdId,
                'X-CSRFToken': signature.csrfToken,
                'X-Requested-With': 'XMLHttpRequest',
                'X-Instagram-AJAX': '1',
                'DNT': '1'
            };
        }
    }

    async delay(ms, jitter = 0.3) {
        const jitterAmount = ms * jitter * (Math.random() * 2 - 1);
        const finalDelay = ms + jitterAmount;
        return new Promise(resolve => setTimeout(resolve, finalDelay));
    }

    async fetchWithRetry(url, options, maxRetries = 3) {
        let lastError;
        let username = 'unknown';
        
        const usernameMatch = url.match(/username=([^&]+)/) || url.match(/instagram\.com\/([^/?]+)/);
        if (usernameMatch) {
            username = decodeURIComponent(usernameMatch[1]);
        }
        
        let authStrategy = options.authStrategy || 'standard';
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    await this.delay(2000 * attempt);
                }
                
                if (attempt > 0) {
                    if (attempt === 1) {
                        authStrategy = 'minimal';
                    } else {
                        authStrategy = 'guest';
                    }
                    
                    options.headers = this.createInstagramHeaders(username, authStrategy);
                }
                
                const response = await fetch(url, options);
                
                if (response.status === 429) {
                    console.error(`${color.red}[${getTimestamp()}] [INSTA_API] Rate limited by Instagram, waiting longer...${color.reset}`);
                    await this.delay(5000 * (attempt + 1), 0.5);
                    continue;
                }
                
                if (response.status === 401 || response.status === 403) {
                    this.authStrategies.failures[authStrategy] = (this.authStrategies.failures[authStrategy] || 0) + 1;
                    
                    if (username !== 'unknown') {
                        this.sessionManager.refreshCookie(username);
                    }
                    
                    continue;
                }
                
                if (response.ok) {
                    this.authStrategies.success[authStrategy] = (this.authStrategies.success[authStrategy] || 0) + 1;
                }
                
                return response;
                
            } catch (error) {
                lastError = error;
            }
        }
        
        throw lastError || new Error('All fetch attempts failed');
    }

    async fetchUserViaApi(username) {
        const encodedUsername = encodeURIComponent(username);
        const apiUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodedUsername}`;
        const headers = this.createInstagramHeaders(username, 'standard');
        
        try {
            const response = await this.fetchWithRetry(apiUrl, { 
                headers, 
                authStrategy: 'standard' 
            });
            
            if (!response.ok) return null;
            
            const data = await response.json();
            return data?.data?.user || null;
        } catch (error) {
            return null;
        }
    }

    async fetchUserViaGraphQL(username) {
        const encodedUsername = encodeURIComponent(username);
        const graphqlUrl = `https://www.instagram.com/graphql/query/?query_hash=c9100bf9110dd6361671f113dd02e7d6&variables={"username":"${encodedUsername}","include_reel":false}`;
        const headers = this.createInstagramHeaders(username, 'minimal');
        
        try {
            const response = await this.fetchWithRetry(graphqlUrl, {
                headers,
                authStrategy: 'minimal'
            });
            
            if (!response.ok) return null;
            
            const data = await response.json();
            return data?.data?.user || null;
        } catch (error) {
            return null;
        }
    }

    async fetchUserDirectPage(username) {
        const encodedUsername = encodeURIComponent(username);
        const userUrl = `https://www.instagram.com/${encodedUsername}/?__a=1&__d=dis`;
        const headers = this.createInstagramHeaders(username, 'guest');
        
        try {
            const response = await this.fetchWithRetry(userUrl, {
                headers,
                authStrategy: 'guest'
            });
            
            if (!response.ok) return null;
            
            const data = await response.json();
            return data?.graphql?.user || data?.user || null;
        } catch (error) {
            return null;
        }
    }

    async validateUser(username) {
        try {
            for (let method of ['api', 'graphql', 'direct']) {
                let userData = null;
                
                switch (method) {
                    case 'api':
                        userData = await this.fetchUserViaApi(username);
                        break;
                    case 'graphql':
                        userData = await this.fetchUserViaGraphQL(username);
                        break;
                    case 'direct':
                        userData = await this.fetchUserDirectPage(username);
                        break;
                }
                
                if (userData) {
                    return true;
                }
                
                await this.delay(1000);
            }
            console.error(`${color.yellow}[${getTimestamp()}] [INSTA_API] User ${username} not found or private (tried all methods)${color.reset}`);
            return false;
        } catch (error) {
            return false;
        }
    }

    async getLatestPost(username) {
        if (!this.rateLimiter.checkLimit(username)) {
            return null;
        }
        
        try {
            let userData = await this.fetchUserViaApi(username);
            
            if (!userData) {
                userData = await this.fetchUserViaGraphQL(username);
                
                if (!userData) {
                    userData = await this.fetchUserDirectPage(username);
                    
                    if (!userData) {
                        return null;
                    }
                }
            }
            
            let posts = userData.edge_owner_to_timeline_media?.edges;
            
            if (!posts || posts.length === 0) {
                if (this.logRateLimiter.shouldLog(`no_posts_${username}`, 60)) {}
                return null;
            }
            
            const latestPost = posts[0].node;
            
            return {
                taken_at_timestamp: latestPost.taken_at_timestamp,
                caption: latestPost.edge_media_to_caption?.edges[0]?.node?.text || 'No caption was provided',
                display_url: latestPost.display_url,
                shortcode: latestPost.shortcode
            };
        } catch (error) {
            const now = Date.now();
            const lastErrorTime = this.rateLimiter.lastWarning[`error_${username}`] || 0;
            if (now - lastErrorTime > 60 * 60 * 1000) { 
                this.rateLimiter.lastWarning[`error_${username}`] = now;
            }
            return null;
        }
    }
}

module.exports = new InstagramAPI();
