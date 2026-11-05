import { z } from "zod";

/** Stands in for somebody who deleted their data on a record a server keeps; no Discord id is a single digit. */
export const DELETED_USER_ID = "0";

export const eraseAccountSchema = z.object({ confirm: z.string().max(64) });

export type EraseAccountRequest = z.infer<typeof eraseAccountSchema>;

/** Written where a server's record needs a name, and translated wherever the dashboard shows one. */
export const DELETED_USER_NAME = "Deleted user";
