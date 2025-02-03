const axios = require('axios');

async function getTopItems(accessToken, type) {
    try {
        const response = await axios.get(`https://api.spotify.com/v1/me/top/${type}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            params: {
                limit: 10,
                time_range: 'short_term'
            }
        });
        
        return response.data.items;
    } catch (error) {
        console.error('Error fetching Spotify data:', error);
        throw error;
    }
}

module.exports = { getTopItems };