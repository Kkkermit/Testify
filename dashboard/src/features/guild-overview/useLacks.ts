import { type ReaderPermission } from "@testify/shared";
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
