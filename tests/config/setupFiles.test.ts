import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ENV_KEYS } from "@config/env";

const ROOT = resolve(__dirname, "../..");
const read = (file: string): string => readFileSync(resolve(ROOT, file), "utf8");

/** Set by the scripts or the image itself, never by somebody filling in a file. */
const NOT_IN_TEMPLATES = ["NODE_ENV"];
const NOT_IN_COMPOSE = ["NODE_ENV", "MUSIC_YTDLP_PATH", "MUSIC_FFMPEG_PATH"];

describe("the files a new install starts from", () => {
	it.each([".env.example", ".env.development.example"])("%s lists every variable the bot reads", (file) => {
		const listed = new Set([...read(file).matchAll(/^([A-Z_]+)=/gm)].map((match) => match[1]));

		expect(ENV_KEYS.filter((key) => !NOT_IN_TEMPLATES.includes(key) && !listed.has(key))).toEqual([]);
	});

	/** BOT_NAME and the support key were set in .env and silently ignored by `docker compose up`. */
	it("docker-compose.yml passes every variable through to the bot", () => {
		const compose = read("docker-compose.yml");

		expect(ENV_KEYS.filter((key) => !NOT_IN_COMPOSE.includes(key) && !compose.includes(`${key}:`))).toEqual([]);
	});
});
