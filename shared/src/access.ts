import { z } from "zod";
import { snowflake } from "./schemas";

/** Every server screen a manager may hand to somebody without Manage Server, named by its path under the server. */
export const ACCESS_AREAS = [
	"members",
	"channels",
	"roles",
	"settings",
	"commands",
	"welcome",
	"birthdays",
	"levelling",
	"role-menus",
	"ideas",
	"starboard",
	"temp-voice",
	"announcements",
	"scheduled-messages",
	"sticky",
	"auto-responders",
	"automod",
	"raid-protection",
	"warnings",
	"cases",
	"bans",
	"appeals",
	"modmail",
	"channel-tools",
	"tickets",
	"audit-log",
	"changes",
	"insights",
	"invites",
	"member-count",
	"bot-stats",
	"economy",
	"treasure",
	"lottery",
	"casino",
	"music",
	"giveaways",
] as const;

export type AccessArea = (typeof ACCESS_AREAS)[number];

export const ACCESS_LIMITS = {
	/** A server with more people than this to trust is better served by giving a Discord role Manage Server. */
	maxPeople: 50,
	activityShown: 25,
} as const;

export function isAccessArea(value: string): value is AccessArea {
	return (ACCESS_AREAS as readonly string[]).includes(value);
}

/** In the order `ACCESS_AREAS` lists them and each once, so two requests naming the same set store the same thing. */
const areas = z
	.array(z.enum(ACCESS_AREAS))
	.min(1)
	.max(ACCESS_AREAS.length)
	.transform((chosen) => ACCESS_AREAS.filter((area) => chosen.includes(area)));

export const accessGrantBody = z.object({ userId: snowflake, areas }).strict();

export const accessAreasBody = z.object({ areas }).strict();

export type AccessGrantInput = z.input<typeof accessGrantBody>;

export interface AccessPerson {
	userId: string;
	username: string;
	avatarUrl: string | null;
	inServer: boolean;
	areas: AccessArea[];
	addedBy: { id: string; name: string };
	addedAt: string;
	updatedAt: string;
	/** When they last opened one of this server's screens, to the nearest ten minutes. */
	lastSeenAt: string | null;
	lastChangeAt: string | null;
	changes: number;
}

export interface AccessList {
	people: AccessPerson[];
}
