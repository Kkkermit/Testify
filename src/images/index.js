const path = require('path');
const { AttachmentBuilder } = require('discord.js');

function createAttachment(filename) {
    const attachment = new AttachmentBuilder(path.join(__dirname, `./val-emojis/${filename}.png`));
    attachment.setName(`${filename}.png`);
    return {
        attachment,
        getURL: () => `attachment://${filename}.png`
    };
}

const editions = {
    deluxe: createAttachment('Deluxe_Edition'),
    exclusive: createAttachment('Exclusive_Edition'),
    premium: createAttachment('Premium_Edition'),
    select: createAttachment('Select_Edition'),
    ultra: createAttachment('Ultra_Edition'),
    kingdomCredits: createAttachment('ValoKingdomCredits'),
    points: createAttachment('ValoPoints'),
    radianite: createAttachment('ValoRadianite')
};

module.exports = {
    getAttachment: (type) => editions[type].attachment,
    getURL: (type) => editions[type].getURL(),
    getEditionURL: (editionName) => {
        const type = editionName.toLowerCase().replace('_edition', '');
        return editions[type]?.getURL();
    },
    getAllAttachments: () => Object.values(editions).map(e => e.attachment)
};