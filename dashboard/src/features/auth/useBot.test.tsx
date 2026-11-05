import { DEFAULT_BOT_NAME } from "@testify/shared";
import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useTranslation } from "react-i18next";
import { retryBot, useBot, useBotLook } from "@/features/auth/useBot";
import { usePageTitle } from "@/hooks/usePageTitle";
import { currentBotName, nameTheBot } from "@/i18n";
import { ApiError } from "@/lib/api";
import { rememberedBotLook, rememberedBotName } from "@/lib/brand";
import { botProfile } from "@/test/fixtures/session";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

function Named(): React.JSX.Element {
	useBot();
	usePageTitle("Servers");
	const { t } = useTranslation();

	return <p>{t("guilds.invitableTitle")}</p>;
}

afterEach(() => {
	nameTheBot(DEFAULT_BOT_NAME);
});

describe("the bot's name", () => {
	it("is the built-in one until Discord says otherwise", () => {
		expect(currentBotName()).toBe(DEFAULT_BOT_NAME);
	});

	/** A fork renamed in Discord kept reading as the original everywhere the dashboard names the bot. */
	it("follows the bot's own username into every string and the page title", async () => {
		server.use(
			http.get("/api/bot", () => HttpResponse.json({ ...botProfile, name: "Helper", username: "helper-app" })),
		);
		renderWithProviders(<Named />);

		expect(await screen.findByText("Add Helper")).toBeInTheDocument();
		await waitFor(() => {
			expect(document.title).toBe("Servers · Helper");
		});
	});

	/** The next visit names the bot before the API has answered, rather than showing a name it does not have. */
	it("is remembered for the next visit", async () => {
		server.use(http.get("/api/bot", () => HttpResponse.json({ ...botProfile, name: "Helper" })));
		renderWithProviders(<Named />);

		await waitFor(() => {
			expect(rememberedBotName()).toBe("Helper");
		});
		localStorage.removeItem("testify:botName");
	});
});

function Face(): React.JSX.Element {
	const look = useBotLook();
	return <p>{look.avatarUrl ?? "no picture"}</p>;
}

describe("the bot's face", () => {
	afterEach(() => {
		localStorage.removeItem("testify:botLook");
	});

	/** With `dev:all` the bot restarts on every save, and the sign-in screen showed a built-in shield until it was back. */
	it("is the picture it last gave while the API is not answering", async () => {
		localStorage.setItem(
			"testify:botLook",
			JSON.stringify({
				avatarUrl: "https://cdn.discordapp.com/avatars/1/old.png",
				bannerUrl: null,
				accentColour: null,
			}),
		);
		server.use(
			http.get("/api/bot", () =>
				HttpResponse.json({ error: { code: "api_down", message: "The bot is not running." } }, { status: 503 }),
			),
		);
		renderWithProviders(<Face />);

		expect(await screen.findByText("https://cdn.discordapp.com/avatars/1/old.png")).toBeInTheDocument();
	});

	it("remembers the live picture, banner and colour for next time", async () => {
		server.use(
			http.get("/api/bot", () =>
				HttpResponse.json({
					...botProfile,
					avatarUrl: "https://cdn.discordapp.com/avatars/1/new.png",
					bannerUrl: "https://cdn.discordapp.com/banners/1/new.png",
					accentColour: "#7c3aed",
				}),
			),
		);
		renderWithProviders(<Face />);

		await waitFor(() => {
			expect(rememberedBotLook()).toEqual(
				expect.objectContaining({
					avatarUrl: "https://cdn.discordapp.com/avatars/1/new.png",
					bannerUrl: "https://cdn.discordapp.com/banners/1/new.png",
					accentColour: "#7c3aed",
				}),
			);
		});
	});

	/** Storage is whatever was last written to it, so only Discord's own CDN is ever drawn from it. */
	it("refuses a remembered picture that is not on Discord's CDN", () => {
		localStorage.setItem(
			"testify:botLook",
			JSON.stringify({
				avatarUrl: "https://evil.example/a.png",
				bannerUrl: "http://cdn.discordapp.com/b.png",
				accentColour: "red",
			}),
		);

		expect(rememberedBotLook()).toEqual(
			expect.objectContaining({ avatarUrl: null, bannerUrl: null, accentColour: null }),
		);
	});

	/** A restart under `dev:all` takes twenty seconds or so; two quick retries gave up long before it was back. */
	it("keeps asking while the bot restarts, as it does while it connects", () => {
		const down = new ApiError(503, { error: { code: "api_down", message: "The bot is not running." } });
		const broken = new ApiError(500, { error: { code: "internal", message: "Something broke." } });

		expect(retryBot(10, down)).toBe(true);
		expect(retryBot(2, broken)).toBe(false);
	});
});
