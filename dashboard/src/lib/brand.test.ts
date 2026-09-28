import { nameHomeScreen } from "@/lib/brand";

afterEach(() => {
	document.head.querySelectorAll("meta[name]").forEach((meta) => {
		meta.remove();
	});
});

function content(name: string): string | null {
	return document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content ?? null;
}

describe("nameHomeScreen", () => {
	/** Without it a phone offers "Owner console · …" as the shortcut's name, and draws its first letter as the icon. */
	it("names the home-screen shortcut after the bot", () => {
		nameHomeScreen("Nova");

		expect(content("apple-mobile-web-app-title")).toBe("Nova");
		expect(content("application-name")).toBe("Nova");
	});

	it("renames rather than adding a second tag when the name changes", () => {
		nameHomeScreen("Nova");
		nameHomeScreen("Orbit");

		expect(document.head.querySelectorAll('meta[name="apple-mobile-web-app-title"]')).toHaveLength(1);
		expect(content("apple-mobile-web-app-title")).toBe("Orbit");
	});
});
