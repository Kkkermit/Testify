import { type GuildOverview } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { Navigate, Outlet, useLocation, useParams } from "react-router";
import { useRecheckOnRefusal } from "@/app/useRecheckOnRefusal";
import { PageHeader, Skeleton } from "@/components/primitives";
import { allNavItems, moderatorMayOpen, navigationFor } from "@/config/navigation";
import { NeedsPermission } from "@/features/guild-overview/components/NeedsPermission";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { accessFrom } from "@/features/guild-overview/useLacks";
import { usePageTitle } from "@/hooks/usePageTitle";
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
	const { pathname } = useLocation();
	const overview = useGuildOverview(guildId);
	useRecheckOnRefusal(
		(key) => (key[0] === "guild" || key[0] === "command-toggles") && key[1] === guildId,
		keys.guild(guildId).overview(),
	);

	if (overview.isPending) return <Skeleton className="h-64 w-full" />;
	if (deniesAccess(overview.error)) return <Navigate to="/guilds" replace state={{ notice: GUILD_REFUSED_NOTICE }} />;
	if (overview.data !== undefined && accessFrom(overview.data) === "moderate" && !moderatorMayOpen(pathname, guildId)) {
		return <ManagersOnly guild={overview.data} pathname={pathname} />;
	}

	return <Outlet />;
}

/** A moderator who follows a link to a setting is told what it needs here, and nothing behind it is asked for. */
function ManagersOnly({ guild, pathname }: { guild: GuildOverview; pathname: string }): React.JSX.Element {
	const { t } = useTranslation();
	const screen = allNavItems(navigationFor({ guild, isOwner: false }))
		.filter((item) => item.to !== `/guilds/${guild.id}` && (pathname === item.to || pathname.startsWith(`${item.to}/`)))
		.sort((a, b) => b.to.length - a.to.length)[0];
	const title = screen === undefined ? t("guilds.managersOnlyTitle") : t(screen.labelKey);

	usePageTitle(title, guild.name);

	return (
		<>
			<PageHeader server={guild} title={title} />
			<NeedsPermission permission="ManageGuild" />
		</>
	);
}
