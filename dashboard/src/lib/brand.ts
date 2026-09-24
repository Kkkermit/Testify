import { DEFAULT_BOT_NAME } from "@testify/shared";

/** What to call the bot before `/api/bot` has answered: `BOT_NAME` from `.env` at build time, else the default. */
export const BUILT_IN_BOT_NAME: string = typeof __BOT_NAME__ === "string" ? __BOT_NAME__ : DEFAULT_BOT_NAME;
