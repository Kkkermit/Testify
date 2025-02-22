const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.isButton()) return;

        if (!interaction.customId.startsWith('skin-preview') || !interaction.customId.startsWith('skin-chroma') || !interaction.customId.startsWith('skin-level')) return;

        const args = interaction.customId.split("_");
        const custom_id = args.shift();

        const skin = client.skins.find(s => s["uuid"] === custom_id == "skin-preview" ? args[1] : args[0]);

        let ChromaComponents, LevelComponents, PreviewComponents, Embed, i;

        switch (custom_id) {
            case 'skin-preview':
                const PreviewType = args[0];
                const index = args[2];
        
                const Video = PreviewType == 'chromas' && index == "0" ? skin["levels"][index]["streamedVideo"] : skin[PreviewType][index]["streamedVideo"];
        
                return await interaction.reply({ content: Video, ephemeral: true });
            break;
            case 'skin-chroma':
                const SelectedChroma = skin["chromas"][Number(args[1])];

                const ChromaImage = SelectedChroma["displayIcon"] || SelectedChroma["fullRender"];
                const ChromaPreviewVideo = SelectedChroma["streamedVideo"] || skin["levels"][0]["streamedVideo"];
        
                ChromaComponents = interaction.message.components[0];
                LevelComponents = interaction.message.components[1];
                PreviewComponents = interaction.message.components[2];
        
                i = 0;
                for (const ChromaComponent of ChromaComponents["components"]) {
                    if (i == args[1]) {
                        ChromaComponent["data"]["disabled"] = true;
                    } else {
                        ChromaComponent["data"]["disabled"] = false;
                    }
                    i++;
                }
        
                let levelId;
        
                i = 0;
                for (const LevelComponent of LevelComponents["components"]) {
                    if (Number(args[1]) !== 0 && i === LevelComponents["components"].length - 1) {
                        LevelComponent["data"]["disabled"] = true;
                        levelId = i;
                    } else if (Number(args[1]) === 0 && i === 0) {
                        LevelComponent["data"]["disabled"] = true;
                        levelId = i;
                    } else {
                        LevelComponent["data"]["disabled"] = false;
                    }
                    i++;
                }
        
                PreviewComponents["components"][0]["data"]["custom_id"] = PreviewComponents["components"][0]["data"]["custom_id"].slice(0, -1) + args[1];
                PreviewComponents["components"][1]["data"]["custom_id"] = PreviewComponents["components"][1]["data"]["custom_id"].slice(0, -1) + levelId;
        
                PreviewComponents["components"][0]["data"]["disabled"] = ChromaPreviewVideo ? false : true;
                PreviewComponents["components"][1]["data"]["disabled"] = skin["levels"][levelId]["streamedVideo"] ? false : true;
        
                Embed = interaction.message.embeds[0];
        
                Embed["data"]["image"] = {
                    "url": ChromaImage
                }
        
                return await interaction.update({ embeds: [Embed], components: [ChromaComponents, LevelComponents, PreviewComponents] });
            break;
            case 'skin-level':
                const SelectedLevel = skin["levels"][Number(args[1])];
                const BaseVariantImage = skin["chromas"][0]["displayIcon"] || skin["displayIcon"];
                const LevelPreviewVideo = SelectedLevel["streamedVideo"];
        
                ChromaComponents = interaction.message.components[0];
                LevelComponents = interaction.message.components[1];
                PreviewComponents = interaction.message.components[2];
        
                i = 0;
                for (const ChromaComponent of ChromaComponents["components"]) {
                    if (i == 0) { //args[1]) {
                        ChromaComponent["data"]["disabled"] = true;
                    } else {
                        ChromaComponent["data"]["disabled"] = false;
                    }
                    i++;
                }
        
                i = 0;
                for (const LevelComponent of LevelComponents["components"]) {
                    if (i == Number(args[1])) {
                        LevelComponent["data"]["disabled"] = true;
                    // } else if (Number(args[1]) === 0 && i === 0) {
                    //     LevelComponent["data"]["disabled"] = true;
                   } else {
                        LevelComponent["data"]["disabled"] = false;
                    }
                    i++;
                }
        
                PreviewComponents["components"][0]["data"]["custom_id"] = PreviewComponents["components"][0]["data"]["custom_id"].slice(0, -1) + "0";
                PreviewComponents["components"][1]["data"]["custom_id"] = PreviewComponents["components"][1]["data"]["custom_id"].slice(0, -1) + args[1];
        
                PreviewComponents["components"][0]["data"]["disabled"] = LevelPreviewVideo ? false : true;
                PreviewComponents["components"][1]["data"]["disabled"] = skin["levels"][0]["streamedVideo"] ? false : true;
        
                Embed = interaction.message.embeds[0];
        
                Embed["data"]["image"] = {
                    "url": BaseVariantImage
                }
        
                return await interaction.update({ embeds: [Embed], components: [ChromaComponents, LevelComponents, PreviewComponents] });
            break;
        }
    }
}
