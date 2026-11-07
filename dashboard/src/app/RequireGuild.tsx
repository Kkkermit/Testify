import { type GuildOverview, screenIsOff } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { Navigate, Outlet, useLocation, useParams } from "react-router";
import { useRecheckOnRefusal } from "@/app/useRecheckOnRefusal";
import { Warning } from "@/components/form";
import { PageHeader, Skeleton } from "@/components/primitives";
import { allNavItems, mayOpen, navigationFor } from "@/config/navigation";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useFeaturesOff } from "@/features/site/useFeaturesOff";
import { useSite } from "@/features/site/useSite";
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
	const site = useSite();
	const featuresOff = useFeaturesOff();
	useRecheckOnRefusal(
		(key) => (key[0] === "guild" || key[0] === "command-toggles") && key[1] === guildId,
		keys.guild(guildId).overview(),
	);

	if (overview.isPending || site.isPending) return <Skeleton className="h-64 w-full" />;
	if (deniesAccess(overview.error)) return <Navigate to="/guilds" replace state={{ notice: GUILD_REFUSED_NOTICE }} />;
	if (overview.data !== undefined && screenIsOff(featuresOff, pathname) !== null) {
		return <Withheld guild={overview.data} pathname={pathname} why="switchedOff" />;
	}
	if (overview.data !== undefined && !mayOpen(pathname, guildId, overview.data.yourAreas)) {
		return <Withheld guild={overview.data} pathname={pathname} why="notGranted" />;
	}

	return <Outlet />;
}

/** A switched-off screen, or one a partial grant leaves out, says so and asks the API for nothing behind it. */
function Withheld({
	guild,
	pathname,
	why,
}: {
	guild: GuildOverview;
	pathname: string;
	why: "switchedOff" | "notGranted";
}): React.JSX.Element {
	const { t } = useTranslation();
	const screen = allNavItems(navigationFor({ guild, isOwner: false }))
		.filter((item) => item.to !== `/guilds/${guild.id}` && (pathname === item.to || pathname.startsWith(`${item.to}/`)))
		.sort((a, b) => b.to.length - a.to.length)[0];
	const title = screen === undefined ? t("guilds.notGrantedTitle") : t(screen.labelKey);

	usePageTitle(title, guild.name);

	return (
		<>
			<PageHeader server={guild} title={title} />
			<Warning>{why === "switchedOff" ? t("guilds.switchedOff") : t("guilds.notGranted")}</Warning>
		</>
	);
}
