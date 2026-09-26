/// <reference types="vite/client" />

/** `BOT_NAME` from the bot's `.env`, written in by Vite; absent under Jest, which falls back to the default. */
declare const __BOT_NAME__: string | undefined;

/** True on the Vite dev server only; the route error screen shows its stack when it is set. */
declare const __DEV_ERRORS__: boolean | undefined;
