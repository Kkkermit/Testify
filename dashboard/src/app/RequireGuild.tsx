import { Navigate, Outlet, useParams } from "react-router";
import { useRecheckOnRefusal } from "@/app/useRecheckOnRefusal";
import { Skeleton } from "@/components/primitives";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { ApiError } from "@/lib/api";
import { keys } from "@/lib/queries";

export const GUILD_REFUSED_NOTICE = "guild-refused";

function deniesAccess(error: unknown): boolean {
	if (!(error instanceof ApiError)) return false;
	return (
		error.status === 401 || (error.status === 403 && ["missing_manage_guild", "not_a_member"].includes(error.code))
	);
}

/** A guild list rewritten in the browser can offer any server, so nothing draws until the server confirms access. */
export function RequireGuild(): React.JSX.Element {
	const { guildId = "" } = useParams();
	const overview = useGuildOverview(guildId);
	useRecheckOnRefusal(
		(key) => (key[0] === "guild" || key[0] === "command-toggles") && key[1] === guildId,
		keys.guild(guildId).overview(),
	);

	if (overview.isPending) return <Skeleton className="h-64 w-full" />;
	if (deniesAccess(overview.error)) return <Navigate to="/guilds" replace state={{ notice: GUILD_REFUSED_NOTICE }} />;

	return <Outlet />;
}
