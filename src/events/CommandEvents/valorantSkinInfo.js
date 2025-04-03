const { Events, MessageFlags } = require("discord.js");

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction, client) {
		if (!interaction.isButton()) return;

		const customId = interaction.customId;
		if (!customId.startsWith("skin-")) return;

		const [type, ...rest] = customId.split("_");
        const skinUUID = type === "skin-preview" ? rest[1] : rest[0];

        const skin = client.skins.find((s) => s["uuid"] === skinUUID);
        if (!skin) return interaction.reply({ content: "Skin not found!", flags: MessageFlags.Ephemeral });

        let ChromaComponents, LevelComponents, PreviewComponents, Embed, i;

		try {
			switch (type) {
				case "skin-preview":
                    const PreviewType = rest[0];
                    const index = parseInt(rest[2]);

                    if (!skin[PreviewType] || !skin[PreviewType][index]) {
                        return interaction.reply({ content: "Preview not available!", flags: MessageFlags.Ephemeral });
                    }

                    const Video = PreviewType === "chromas" && index === 0 
                        ? skin["levels"]?.[index]?.["streamedVideo"]
                        : skin[PreviewType]?.[index]?.["streamedVideo"];

                    if (!Video) {
                        return interaction.reply({ content: "No video preview available!", flags: MessageFlags.Ephemeral });
                    }

                    return await interaction.reply({ content: Video, flags: MessageFlags.Ephemeral });

				case "skin-chroma":
					const chromaIndex = Number(rest[1]);
					if (!skin["chromas"] || !skin["chromas"][chromaIndex]) {
						return interaction.reply({ content: "Chroma not found!", flags: MessageFlags.Ephemeral });
					}
				
					const SelectedChroma = skin["chromas"][chromaIndex];
					const ChromaImage = SelectedChroma["displayIcon"] || SelectedChroma["fullRender"];
					const ChromaPreviewVideo = SelectedChroma["streamedVideo"] || skin["levels"]?.[0]?.["streamedVideo"];
				
					ChromaComponents = interaction.message.components[0];
					LevelComponents = interaction.message.components[1];
					PreviewComponents = interaction.message.components[2];
				
					i = 0;
					for (const ChromaComponent of ChromaComponents["components"]) {
						ChromaComponent["data"]["disabled"] = i == rest[1]; 
						i++;
					}
				
					let levelId;
					i = 0;
					for (const LevelComponent of LevelComponents["components"]) {
						if (Number(rest[1]) !== 0 && i === LevelComponents["components"].length - 1) {
							LevelComponent["data"]["disabled"] = true;
							levelId = i;
						} else if (Number(rest[1]) === 0 && i === 0) {
							LevelComponent["data"]["disabled"] = true;
							levelId = i;
						} else {
							LevelComponent["data"]["disabled"] = false;
						}
						i++;
					}
				
					PreviewComponents["components"][0]["data"]["custom_id"] = `skin-preview_chromas_${skinUUID}_${rest[1]}`;
					PreviewComponents["components"][1]["data"]["custom_id"] = `skin-preview_levels_${skinUUID}_${levelId}`;
					PreviewComponents["components"][0]["data"]["disabled"] = !ChromaPreviewVideo;
					PreviewComponents["components"][1]["data"]["disabled"] = !skin["levels"]?.[levelId]?.["streamedVideo"];

					Embed = interaction.message.embeds[0];
					Embed["data"]["image"] = { url: ChromaImage };

					return await interaction.update({
						embeds: [Embed],
						components: [ChromaComponents, LevelComponents, PreviewComponents],
					});

				case "skin-level":
					const levelIndex = Number(rest[1]);
					if (!skin["levels"] || !skin["levels"][levelIndex]) {
						return interaction.reply({ content: "Level not found!", flags: MessageFlags.Ephemeral });
					}
				
					const SelectedLevel = skin["levels"][levelIndex];
					const BaseVariantImage = skin["chromas"]?.[0]?.["displayIcon"] || skin["displayIcon"];
					const LevelPreviewVideo = SelectedLevel?.["streamedVideo"];
				
					ChromaComponents = interaction.message.components[0];
					LevelComponents = interaction.message.components[1];
					PreviewComponents = interaction.message.components[2];
				
					i = 0;
					for (const ChromaComponent of ChromaComponents["components"]) {
						ChromaComponent["data"]["disabled"] = i === 0;
						i++;
					}
				
					i = 0;
					for (const LevelComponent of LevelComponents["components"]) {
						LevelComponent["data"]["disabled"] = i === Number(rest[1]);
						i++;
					}
				
					PreviewComponents["components"][0]["data"]["custom_id"] = `skin-preview_chromas_${skinUUID}_0`;
					PreviewComponents["components"][1]["data"]["custom_id"] = `skin-preview_levels_${skinUUID}_${rest[1]}`; 
					PreviewComponents["components"][0]["data"]["disabled"] = !LevelPreviewVideo;
					PreviewComponents["components"][1]["data"]["disabled"] = !skin["levels"]?.[0]?.["streamedVideo"];
				
					Embed = interaction.message.embeds[0];
					Embed["data"]["image"] = { url: BaseVariantImage };
				
					return await interaction.update({
						embeds: [Embed],
						components: [ChromaComponents, LevelComponents, PreviewComponents],
					});
			}
		} catch (error) {
            client.logs.error("[VAL_SEARCH_SKIN_BUTTON] Button Interaction Error:", {
                error,
                customId,
                type,
                rest,
                skinUUID
            });
            return interaction.reply({
                content: "An error occurred while processing the skin information.",
                flags: MessageFlags.Ephemeral
            });
        }
	},
};
