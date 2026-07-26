import { Category } from "../../../config/categories";
import { theme } from "../../../config/theme";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { deleteSpotifyLink } from "../../../database/repositories/integrationRepository";
import { authorizeUrl, currentlyPlaying, type TimeRange, topArtists, topTracks } from "../../../integrations/spotify";
import { linkButton, row } from "../../../ui/components";
import { embed, successEmbed } from "../../../ui/embeds";
import { formatTrackTime, progressBar, truncate } from "../../../ui/format";
import { accessTokenFor, signState, spotifyCredentials } from "../services/spotifySession";

const RANGES = [
	{ name: "last 4 weeks", value: "short_term" },
	{ name: "last 6 months", value: "medium_term" },
	{ name: "all time", value: "long_term" },
];

export default defineCommand({
	name: "spotify",
	description: "Links your Spotify account and shows your listening stats.",
	category: Category.Integrations,
	surfaces: ["slash"],
	cooldownMs: 3_000,
	subcommands: [
		{
			name: "login",
			description: "Link your Spotify account.",
			async execute(ctx) {
				const credentials = spotifyCredentials(ctx.client);
				const url = authorizeUrl(credentials, signState(ctx.client, ctx.user.id));

				await ctx.reply({
					embeds: [
						embed({
							color: theme.colors.spotify,
							title: "Link your Spotify account",
							description: "Open the link below and approve access. The link is signed and expires in ten minutes.",
						}),
					],
					components: [row(linkButton("Authorise Spotify", url, "🎧"))],
					ephemeral: true,
				});
			},
		},
		{
			name: "logout",
			description: "Unlink your Spotify account.",
			async execute(ctx) {
				const removed = await deleteSpotifyLink(ctx.user.id);
				if (!removed) throw new UserFacingError("Your Spotify account is not linked.");

				await ctx.reply({ embeds: [successEmbed("Your Spotify account has been unlinked.")], ephemeral: true });
			},
		},
		{
			name: "top-tracks",
			description: "Your most played tracks.",
			options: [{ name: "range", description: "The time range.", type: "string", choices: RANGES }],
			async execute(ctx) {
				await ctx.defer();

				const range = (ctx.options.getString("range") ?? "medium_term") as TimeRange;
				const token = await accessTokenFor(ctx.client, ctx.user.id);
				const tracks = await topTracks(token, range);

				await ctx.reply({
					embeds: [
						embed({
							color: theme.colors.spotify,
							title: `${ctx.user.username}'s top tracks`,
							description:
								tracks
									.map(
										(track, index) =>
											`\`${index + 1}.\` [${truncate(track.name, 50)}](${track.external_urls.spotify}) \u2014 ${track.artists.map((artist) => artist.name).join(", ")}`,
									)
									.join("\n") || "No listening data for that range.",
							...(tracks[0]?.album.images[0] !== undefined ? { thumbnail: tracks[0].album.images[0].url } : {}),
							footer: RANGES.find((entry) => entry.value === range)?.name ?? range,
						}),
					],
				});
			},
		},
		{
			name: "top-artists",
			description: "Your most played artists.",
			options: [{ name: "range", description: "The time range.", type: "string", choices: RANGES }],
			async execute(ctx) {
				await ctx.defer();

				const range = (ctx.options.getString("range") ?? "medium_term") as TimeRange;
				const token = await accessTokenFor(ctx.client, ctx.user.id);
				const artists = await topArtists(token, range);

				await ctx.reply({
					embeds: [
						embed({
							color: theme.colors.spotify,
							title: `${ctx.user.username}'s top artists`,
							description:
								artists
									.map(
										(artist, index) =>
											`\`${index + 1}.\` [${artist.name}](${artist.external_urls.spotify})${artist.genres[0] !== undefined ? ` \u2014 ${artist.genres[0]}` : ""}`,
									)
									.join("\n") || "No listening data for that range.",
							...(artists[0]?.images[0] !== undefined ? { thumbnail: artists[0].images[0].url } : {}),
							footer: RANGES.find((entry) => entry.value === range)?.name ?? range,
						}),
					],
				});
			},
		},
		{
			name: "now-playing",
			description: "What you are listening to right now.",
			async execute(ctx) {
				await ctx.defer();

				const token = await accessTokenFor(ctx.client, ctx.user.id);
				const playing = await currentlyPlaying(token);

				if (!playing?.item) throw new UserFacingError("You are not listening to anything right now.");

				const progress = playing.progress_ms ?? 0;

				await ctx.reply({
					embeds: [
						embed({
							color: theme.colors.spotify,
							title: playing.item.name,
							url: playing.item.external_urls.spotify,
							description: [
								playing.item.artists.map((artist) => artist.name).join(", "),
								"",
								`${formatTrackTime(progress)} ${progressBar(progress, playing.item.duration_ms)} ${formatTrackTime(playing.item.duration_ms)}`,
							].join("\n"),
							fields: [{ name: "Album", value: playing.item.album.name, inline: true }],
							...(playing.item.album.images[0] !== undefined ? { thumbnail: playing.item.album.images[0].url } : {}),
							footer: playing.is_playing ? "Playing" : "Paused",
						}),
					],
				});
			},
		},
	],

	async execute(ctx) {
		await ctx.reply({
			content: "Pick a subcommand: `login`, `logout`, `top-tracks`, `top-artists` or `now-playing`.",
			ephemeral: true,
		});
	},
});
