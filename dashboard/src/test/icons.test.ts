import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/** The icons are served from `public/` under their own names, so a link to a file that is not there fails silently. */

const ROOT = resolve(__dirname, "..", "..");
const PUBLIC = resolve(ROOT, "public");
const INDEX = readFileSync(resolve(ROOT, "index.html"), "utf8");

function linked(rel: string): string | undefined {
	return new RegExp(`<link rel="${rel}"[^>]*href="([^"]+)"`).exec(INDEX)?.[1];
}

function pngSize(path: string): { width: number; height: number } {
	const bytes = readFileSync(path);
	return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

describe("the page's icons", () => {
	it.each(["icon", "apple-touch-icon", "manifest"])("links a %s that exists at the root", (rel) => {
		const href = linked(rel);

		expect(href).toMatch(/^\/[\w.-]+$/);
		expect(existsSync(resolve(PUBLIC, `.${href ?? ""}`))).toBe(true);
	});

	/** iOS looks for exactly this path when a browser hands it nothing better, and asks for 180 pixels. */
	it("keeps the home-screen icon at the conventional path and size", () => {
		expect(linked("apple-touch-icon")).toBe("/apple-touch-icon.png");
		expect(pngSize(resolve(PUBLIC, "apple-touch-icon.png"))).toEqual({ width: 180, height: 180 });
	});

	it("lists manifest icons that exist at the sizes they claim", () => {
		const manifest = JSON.parse(readFileSync(resolve(PUBLIC, "manifest.webmanifest"), "utf8")) as {
			icons: { src: string; sizes: string }[];
		};

		expect(manifest.icons.length).toBeGreaterThan(0);
		for (const icon of manifest.icons) {
			const [width, height] = icon.sizes.split("x").map(Number);
			expect(pngSize(resolve(PUBLIC, `.${icon.src}`))).toEqual({ width, height });
		}
	});
});
