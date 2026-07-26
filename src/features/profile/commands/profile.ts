import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { containsProfanity } from "../../../core/contentFilter";
import { strings } from "../../../config/strings";
import { NotFoundError, UserFacingError } from "../../../core/errors";
import { deleteProfile, getProfile, saveProfile } from "../../../database/repositories/integrationRepository";
import { embed, successEmbed } from "../../../ui/embeds";
import { discordTime } from "../../../ui/format";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export default defineCommand({
	name: "profile",
	description: "Views and edits your public profile.",
	category: Category.Profile,
	surfaces: ["slash", "prefix"],
	subcommands: [
		{
			name: "view",
			description: "Look at a profile.",
			options: [{ name: "user", description: "Whose profile. Defaults to you.", type: "user" }],
			async execute(ctx) {
				const target = ctx.options.getUser("user") ?? ctx.user;
				const profile = await getProfile(target.id);
				if (!profile) throw new NotFoundError(`${target.username} has not set up a profile yet.`);

				await ctx.reply({
					embeds: [
						embed({
							category: Category.Profile,
							title: `${target.displayName}'s profile`,
							description: profile.about,
							fields: [
								{ name: "Favourite song", value: profile.favouriteSong, inline: true },
								{ name: "Favourite game", value: profile.favouriteGame ?? "Not set", inline: true },
								{ name: "Hobbies", value: profile.hobbies ?? "Not set", inline: true },
								{
									name: "Birthday",
									value: profile.birthday !== null ? discordTime(profile.birthday, "D") : "Not set",
									inline: true,
								},
								{ name: "Profile created", value: discordTime(profile.createdAt, "R"), inline: true },
							],
							thumbnail: target.displayAvatarURL({ size: 512 }),
						}),
					],
				});
			},
		},
		{
			name: "set",
			description: "Create or update your profile.",
			options: [
				{ name: "about", description: "A short bio.", type: "string", required: true, maxLength: 500 },
				{ name: "favourite-song", description: "Your favourite song.", type: "string", required: true, maxLength: 100 },
				{ name: "favourite-game", description: "Your favourite game.", type: "string", maxLength: 100 },
				{ name: "hobbies", description: "What you do for fun.", type: "string", maxLength: 200 },
				{ name: "birthday", description: "Your birthday, as YYYY-MM-DD.", type: "string" },
			],
			async execute(ctx) {
				const about = ctx.options.getString("about", true);
				const song = ctx.options.getString("favourite-song", true);
				const game = ctx.options.getString("favourite-game");
				const hobbies = ctx.options.getString("hobbies");
				const rawBirthday = ctx.options.getString("birthday");

				for (const value of [about, song, game, hobbies]) {
					if (value !== null && containsProfanity(value)) throw new UserFacingError(strings.generic.profanity);
				}

				let birthday: Date | null = null;
				if (rawBirthday !== null) {
					if (!DATE_PATTERN.test(rawBirthday)) throw new UserFacingError("Write the birthday as `YYYY-MM-DD`.");
					birthday = new Date(`${rawBirthday}T00:00:00Z`);
					if (Number.isNaN(birthday.getTime())) throw new UserFacingError("That is not a real date.");
				}

				await saveProfile(ctx.user.id, {
					about,
					favouriteSong: song,
					favouriteGame: game,
					hobbies,
					birthday,
				});

				await ctx.reply({ embeds: [successEmbed("Your profile has been saved.")], ephemeral: true });
			},
		},
		{
			name: "delete",
			description: "Delete your profile.",
			async execute(ctx) {
				const removed = await deleteProfile(ctx.user.id);
				if (!removed) throw new NotFoundError("You do not have a profile to delete.");

				await ctx.reply({ embeds: [successEmbed("Your profile has been deleted.")], ephemeral: true });
			},
		},
	],

	async execute(ctx) {
		await ctx.reply({ content: "Pick a subcommand: `view`, `set` or `delete`.", ephemeral: true });
	},
});
