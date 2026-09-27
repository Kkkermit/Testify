import { Navigate, Outlet, useParams } from "react-router";
import { useRecheckOnRefusal } from "@/app/useRecheckOnRefusal";
import { Skeleton } from "@/components/primitives";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { ApiError } from "@/lib/api";
import { keys } from "@/lib/queries";

/** Read by the server list, which says why the reader landed there. */
export const GUILD_REFUSED_NOTICE = "guild-refused";

/** Signed out, not in the server, or without Manage Server; a bot that has left is a different screen. */
function deniesAccess(error: unknown): boolean {
	if (!(error instanceof ApiError)) return false;
	return (
		error.status === 401 || (error.status === 403 && ["missing_manage_guild", "not_a_member"].includes(error.code))
	);
}

/**
 * Draws a server's screens only once the server has let this person manage it, because a guild list rewritten in the
 * browser can offer any server at all; the API's `requireGuild` refuses regardless, and this only decides what shows.
 */
export function RequireGuild(): React.JSX.Element {
	const { guildId = "" } = useParams();
	const overview = useGuildOverview(guildId);
	useRecheckOnRefusal(
		(key) => (key[0] === "guild" || key[0] === "command-toggles") && key[1] === guildId,
		keys.guild(guildId).overview(),
	);

	if (overview.isPending) return <Skeleton className="h-64 w-full" />;
	if (deniesAccess(overview.error)) return <Navigate to="/guilds" replace state={{ notice: GUILD_REFUSED_NOTICE }} />;

	// Any other failure is each screen's own to explain, with the retry or the invite that suits it.
	return <Outlet />;
}
