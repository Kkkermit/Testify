const axios = require('axios');

async function getTopItems(accessToken, type, timeRange = 'long_term') {
    try {
        if (type === 'albums') {
            const tracksResponse = await axios.get('https://api.spotify.com/v1/me/top/tracks', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                },
                params: {
                    limit: 50,
                    time_range: timeRange
                }
            });

            const albumMap = new Map();
            tracksResponse.data.items.forEach(track => {
                const album = track.album;
                if (album && album.total_tracks > 3) {
                    const count = albumMap.get(album.id)?.count || 0;
                    albumMap.set(album.id, {
                        id: album.id,
                        name: album.name,
                        artists: album.artists,
                        images: album.images,
                        release_date: album.release_date,
                        count: count + 1
                    });
                }
            });

            const topAlbums = Array.from(albumMap.values())
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);

            return topAlbums;
        }

        const response = await axios.get(`https://api.spotify.com/v1/me/top/${type}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            params: {
                limit: 10,
                time_range: timeRange
            }
        });
        
        return response.data.items;
    } catch (error) {}
}

module.exports = { getTopItems };