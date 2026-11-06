import { type AccessArea, type GuildOverview, type ReaderPermission } from "@testify/shared";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";

/** Whether the reader lacks a permission here; nothing is lacking until the overview has said, so the server decides. */
export function useLacks(guildId: string): (permission: ReaderPermission) => boolean {
	const held = useGuildOverview(guildId).data?.yourPermissions;
	return (permission) => held !== undefined && !held.includes(permission);
}

/** Whether the reader is known to hold a permission here, which a read that asks for it waits on. */
export function useHolds(guildId: string): (permission: ReaderPermission) => boolean {
	const held = useGuildOverview(guildId).data?.yourPermissions;
	return (permission) => held?.includes(permission) === true;
}

/** Whether the reader may use this screen here; every screen until the overview says otherwise, so the server decides. */
export function useMayOpen(guildId: string): (area: AccessArea) => boolean {
	const areas = useGuildOverview(guildId).data?.yourAreas;
	return (area) => areas === null || areas === undefined || areas.includes(area);
}

/** The owner, the admins and the bot's owners decide who else may use a server's dashboard. */
export function mayGrant(overview: GuildOverview | undefined): boolean {
	return overview?.yourPermissions.includes("Administrator") === true;
}
