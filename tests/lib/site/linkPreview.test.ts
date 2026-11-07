import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { botIdentity } from "@lib/bot/botIdentity.util";
import { type LinkPreview, PREVIEW_WAIT_MS, readLinkPreview, withPreview } from "@lib/site/linkPreview.util";
import { type BotIdentity } from "@testify/shared";
import { createMockClient } from "@tests/helpers/mocks";

jest.mock("@lib/bot/botIdentity.util", () => ({ botIdentity: jest.fn() }));
jest.mock("@core/brand", () => ({ botName: () => "Helper" }));

const SHELL = "<!doctype html><html><head><title>Dashboard</title></head><body></body></html>";
const ENV = {
	SITE_ENABLED: true,
	DASHBOARD_ENABLED: true,
	DASHBOARD_BASE_URL: "https://bot.example",
	DASHBOARD_BIND: "127.0.0.1",
	DASHBOARD_PORT: 3_000,
} as Env;

const BANNER = "https://cdn.discordapp.com/banners/1/b.png?size=1024";
const PICTURE = "https://cdn.discordapp.com/avatars/1/a.png?size=512";

const preview = (overrides: Partial<LinkPreview> = {}): LinkPreview => ({
	name: "Helper",
	description: "Helper brings things to Discord.",
	imageUrl: BANNER,
	wide: true,
	url: "https://bot.example/",
	...overrides,
});

const identity: BotIdentity = {
	id: "1",
	name: "Helper",
	username: "helper",
	avatarUrl: "https://cdn.discordapp.com/avatars/1/a.webp",
	bannerUrl: "https://cdn.discordapp.com/banners/1/b.webp?size=1024",
	accentColour: null,
	supportUrl: "https://discord.gg/example",
	repositoryUrl: "https://github.com/example/bot",
};

const bannerURL = jest.fn<string | null, [unknown]>();

function readyClient(banner: string | null): TestifyClient {
	bannerURL.mockReturnValue(banner);
	return createMockClient({
		isReady: jest.fn(() => true),
		user: { bannerURL, displayAvatarURL: jest.fn(() => PICTURE) },
	} as never);
}

beforeEach(() => jest.mocked(botIdentity).mockResolvedValue(identity));

describe("withPreview", () => {
	/** A crawler reads only the HTML, so without these a pasted link unfurls as a bare address. */
	it("puts the name, the sentence and a banner drawn across the card into the head", () => {
		const page = withPreview(SHELL, preview());

		expect(page).toContain("<title>Helper</title>");
		expect(page).toContain('<meta property="og:title" content="Helper" />');
		expect(page).toContain('<meta property="og:description" content="Helper brings things to Discord." />');
		expect(page).toContain(`<meta property="og:image" content="${BANNER}" />`);
		expect(page).toContain('<meta name="twitter:card" content="summary_large_image" />');
		expect(page).toContain('<meta property="og:url" content="https://bot.example/" />');
		expect(page.indexOf("og:title")).toBeLessThan(page.indexOf("</head>"));
	});

	it("puts a picture beside the text, and leaves out what it does not know", () => {
		const page = withPreview(SHELL, preview({ imageUrl: null, wide: false, url: null }));

		expect(page).toContain('<meta name="twitter:card" content="summary" />');
		expect(page).not.toContain("og:image");
		expect(page).not.toContain("og:url");
	});

	/** The name is whatever the bot's owner typed into Discord, and a page that ran it would be theirs to script. */
	it("escapes the name wherever it is written, and keeps a `$&` in it literal", () => {
		const page = withPreview(SHELL, preview({ name: `"><script>alert(1)</script>$&`, description: "a & b" }));

		expect(page).not.toContain("<script>");
		expect(page).toContain("<title>&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;$&amp;</title>");
		expect(page).toContain('content="a &amp; b"');
	});

	it("leaves a shell with no head alone", () => {
		expect(withPreview("<div id=root></div>", preview())).toBe("<div id=root></div>");
	});
});

describe("readLinkPreview", () => {
	/** WebP is what the dashboard draws, but not every site that unfurls a link can read it. */
	it("shows the bot's banner as a PNG across the card, at the page's own address", async () => {
		const client = readyClient(BANNER);

		const read = await readLinkPreview(client, ENV, "/docs");

		expect(read).toEqual({
			name: "Helper",
			description: expect.stringContaining("Helper brings moderation") as unknown,
			imageUrl: BANNER,
			wide: true,
			url: "https://bot.example/docs",
		});
		expect(bannerURL).toHaveBeenCalledWith({ extension: "png", size: 1024, forceStatic: true });
	});

	it("falls back to the bot's picture beside the text when it has no banner", async () => {
		expect(await readLinkPreview(readyClient(null), ENV, "/")).toMatchObject({ imageUrl: PICTURE, wide: false });
	});

	/** The page waits for the card, so a Discord that never answers must not keep anybody from the site. */
	it("answers with the name alone when the bot's profile does not arrive in time", async () => {
		jest.useFakeTimers();
		jest.mocked(botIdentity).mockReturnValue(new Promise(() => undefined));

		const pending = readLinkPreview(readyClient(BANNER), ENV, "/");
		await jest.advanceTimersByTimeAsync(PREVIEW_WAIT_MS);

		await expect(pending).resolves.toMatchObject({ name: "Helper", imageUrl: null, wide: false });
		jest.useRealTimers();
	});
});
