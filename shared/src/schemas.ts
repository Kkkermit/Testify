import { z } from "zod";

export const snowflake = z.string().regex(/^\d{17,20}$/, "must be a Discord ID");

/** A relative path on this origin. Anything else is an open redirect. */
export const returnTo = z.string().regex(/^\/[a-zA-Z0-9/_-]*$/, "must be a path on this site");

export const guildIdParam = z.object({ guildId: snowflake });
