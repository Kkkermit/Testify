const path = require('path');
const fs = require('fs');
const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');

function createAttachment(directory, filename) {
    const attachment = new AttachmentBuilder(path.join(__dirname, directory, `${filename}.png`));
    attachment.setName(`${filename}.png`);
    return {
        attachment,
        getURL: () => `attachment://${filename}.png`
    };
}

const editions = {
    deluxe: createAttachment('./val-emojis', 'Deluxe_Edition'),
    exclusive: createAttachment('./val-emojis', 'Exclusive_Edition'),
    premium: createAttachment('./val-emojis', 'Premium_Edition'),
    select: createAttachment('./val-emojis', 'Select_Edition'),
    ultra: createAttachment('./val-emojis', 'Ultra_Edition'),
    kingdomCredits: createAttachment('./val-emojis', 'ValoKingdomCredits'),
    points: createAttachment('./val-emojis', 'ValoPoints'),
    radianite: createAttachment('./val-emojis', 'ValoRadianite')
};

const backgroundImagesPath = path.join(__dirname, './dbd-images/backgrounds');
const backgroundRarities = {};

if (fs.existsSync(backgroundImagesPath)) {
    const files = fs.readdirSync(backgroundImagesPath);
    files.forEach(file => {
        if (file.endsWith('.png')) {
            const rarityName = file.replace('.png', '');
            backgroundRarities[rarityName] = path.join(backgroundImagesPath, file);
        }
    });
}

const DEFAULT_RARITY = 'very-rare';
const defaultRarityBackground = backgroundRarities[DEFAULT_RARITY];

const dbdPerks = {};
const dbdImagesPath = path.join(__dirname, './dbd-images');

if (fs.existsSync(dbdImagesPath)) {
    const files = fs.readdirSync(dbdImagesPath);
    
    files.forEach(file => {
        if (file.startsWith('iconPerks_') && file.endsWith('.png')) {
            const perkName = file.slice(10, -4);
            
            const camelCaseName = perkName.charAt(0).toLowerCase() + perkName.slice(1);
            
            dbdPerks[camelCaseName] = {
                attachment: new AttachmentBuilder(path.join(dbdImagesPath, file)),
                fileName: file,
                filePath: path.join(dbdImagesPath, file),
                getURL: () => `attachment://${file}`
            };
        }
    });
}

function normalizeSpecialChars(str) {
    if (!str) return '';
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[&]/g, 'And')
        .replace(/[œ]/g, 'oe')
        .replace(/[æ]/g, 'ae')
        .replace(/[ø]/g, 'o')
        .replace(/[â]/g, 'a')
}

function formatPerkNameForImage(perkName) {
    if (!perkName) return '';
    
    const normalizedName = normalizeSpecialChars(perkName);
    
    const cleanName = normalizedName.replace(/[^a-zA-Z0-9\s]/g, '');
    
    return cleanName
        .trim()
        .split(/\s+/)
        .map((word, index) => {
            if (index === 0) return word.toLowerCase();
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join('');
}

async function createCompositePerkImage(perkName, rarityBackground = DEFAULT_RARITY) {
    try {
        const perk = dbdPerks[perkName];
        if (!perk) return null;

        let backgroundPath = backgroundRarities[rarityBackground] || defaultRarityBackground;
        if (!backgroundPath) return perk.attachment;

        const canvas = createCanvas(256, 256);
        const ctx = canvas.getContext('2d');

        try {
            const backgroundImg = await loadImage(backgroundPath);
            ctx.drawImage(backgroundImg, 0, 0, 256, 256);
            
            const perkImg = await loadImage(perk.filePath);
            ctx.drawImage(perkImg, 32, 32, 192, 192);
        } catch (loadError) {
            console.error(`Error loading images for composite: ${loadError}`);
            return perk.attachment;
        }

        const buffer = canvas.toBuffer('image/png');
        const attachment = new AttachmentBuilder(buffer);
        attachment.setName(`${perkName}_with_bg.png`);

        return attachment;
    } catch (error) {
        console.error(`Error creating composite image for ${perkName}:`, error);
        return dbdPerks[perkName]?.attachment || null;
    }
}

function formatPerkName(perkName) {
    if (!perkName) return '';
    
    const normalizedName = normalizeSpecialChars(perkName);
    
    return normalizedName
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(word => word.length > 0)
        .map((word, index) => {
            if (index === 0) return word.toLowerCase();
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join('');
}

async function getDBDPerkWithBackground(perkName) {
    let formattedName = perkName;
    let attachment = await createCompositePerkImage(formattedName);
    
    if (!attachment && (perkName.includes(' ') || perkName.includes('&') || /[^\w\s]/.test(perkName))) {
        formattedName = formatPerkName(perkName);
        console.log(`Trying alternative formatting: ${formattedName}`);
        attachment = await createCompositePerkImage(formattedName);
    }
    
    return attachment;
}

module.exports = {
    getAttachment: (type) => editions[type]?.attachment,
    getURL: (type) => editions[type]?.getURL(),
    getEditionURL: (editionName) => {
        const type = editionName.toLowerCase().replace('_edition', '');
        return editions[type]?.getURL();
    },
    getAllAttachments: () => Object.values(editions).map(e => e.attachment),
    dbdPerks,
    getDBDPerk: (perkName) => dbdPerks[perkName],
    getDBDPerkAttachment: (perkName) => dbdPerks[perkName]?.attachment,
    getDBDPerkURL: (perkName) => dbdPerks[perkName]?.getURL(),
    getAllDBDPerks: () => Object.keys(dbdPerks),
    getAllDBDPerkAttachments: () => Object.values(dbdPerks).map(p => p.attachment),
    createCompositePerkImage,
    getDBDPerkWithBackground,
    formatPerkName,
    formatPerkNameForImage,
    DEFAULT_RARITY
};