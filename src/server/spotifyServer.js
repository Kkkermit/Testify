require('dotenv').config({ path: '../../../.env'});

const express = require('express');
const axios = require('axios');
const User = require('../schemas/spotifyTrackerSystem');
const { color, getTimestamp, textEffects } = require('../utils/loggingEffects');

const app = express();

const requiredEnvVars = ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET', 'SPOTIFY_REDIRECT_URI'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`${color.red}[${getTimestamp()}] Missing required environment variable: ${envVar} ${color.reset}`);
    }
}

app.get('/callback', async (req, res) => {
    const { code, state } = req.query;
    
    if (!code) {
        return res.status(400).send('No authorization code received');
    }

    try {
        const response = await axios.post('https://accounts.spotify.com/api/token', 
            new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
                client_id: process.env.SPOTIFY_CLIENT_ID,
                client_secret: process.env.SPOTIFY_CLIENT_SECRET,
            }).toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        if (!response.data.access_token) {
            console.error(`${color.red}[${getTimestamp()}] Spotify auth error:`, response.data, `${color.reset}`);
        }

        await User.findOneAndUpdate(
            { discordId: state },
            {
                spotifyAccessToken: response.data.access_token,
                spotifyRefreshToken: response.data.refresh_token,
                tokenExpiry: new Date(Date.now() + response.data.expires_in * 1000)
            },
            { upsert: true }
        );
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Spotify Connected</title>
                <style>
                    body {
                        background-color: #191414;
                        font-family: 'Helvetica Neue', Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                    }
                    .container {
                        text-align: center;
                        padding: 2rem;
                        background: #282828;
                        border-radius: 8px;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
                        animation: fadeIn 0.5s ease-in;
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(-20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    h1 {
                        color: #1DB954;
                        margin-bottom: 1rem;
                    }
                    p {
                        color: #FFFFFF;
                        font-size: 1.2rem;
                        margin-bottom: 2rem;
                    }
                    .success-icon {
                        font-size: 4rem;
                        color: #1DB954;
                        margin-bottom: 1rem;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="success-icon">✓</div>
                    <h1>Successfully Connected!</h1>
                    <p>Your Spotify account has been linked to Discord.<br>You can close this window now.</p>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        console.error(`${color.red}[${getTimestamp()}] Spotify auth error:`, error.response?.data || error.message, `${color.reset}`);
        res.status(500).send('Failed to authenticate with Spotify');
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`${color.green}[${getTimestamp()}]${color.reset} [SPOTIFY_SERVER] Spotify server is running on port:${textEffects.bold}${color.torquise} http://localhost:${PORT} ${color.reset}${textEffects.reset}`);
}).on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`${color.red}[${getTimestamp()}]${color.reset} [SPOTIFY_SERVER] Port ${textEffects.bold}${PORT}${textEffects.reset} is already in use.`);
    } else {
        console.error(`${color.red}[${getTimestamp()}]${color.reset} [SPOTIFY_SERVER] Error starting server:`, error);
    }
});