import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation, useParams } from "react-router";
import { MobileNav } from "@/app/layout/MobileNav";
import { Sidebar } from "@/app/layout/Sidebar";
import { RouteAnnouncer } from "@/app/RouteAnnouncer";
import { UndoProvider } from "@/app/UndoProvider";
import { useBotLook } from "@/features/auth/useBot";
import { useMe } from "@/features/auth/useMe";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { mayGrant } from "@/features/guild-overview/useLacks";
import { NoticeBanner } from "@/features/notices/components/NoticeBanner";
import { QuickSearch } from "@/features/search/QuickSearch";
import { useQuickSearchShortcut } from "@/features/search/useQuickSearchShortcut";
import { useScreenView } from "@/hooks/useScreenView";

export function AppShell(): React.JSX.Element {
	const me = useMe();
	const bot = useBotLook();
	const { guildId } = useParams();
	const location = useLocation();
	const { t } = useTranslation();
	const [menuOpen, setMenuOpen] = useState(false);
	const [searching, setSearching] = useState(false);
	const openSearch = useCallback(() => {
		setMenuOpen(false);
		setSearching(true);
	}, []);
	const closeSearch = useCallback(() => {
		setSearching(false);
	}, []);

	useScreenView();
	useQuickSearchShortcut(
		useCallback(() => {
			setMenuOpen(false);
			setSearching((was) => !was);
		}, []),
	);

	const overview = useGuildOverview(guildId ?? null).data;
	const listed = me.data?.guilds.find((candidate) => candidate.id === guildId);
	// The overview is read live, so access taken away or narrowed shows on the next click.
	const guild = listed === undefined || overview === undefined ? listed : { ...listed, areas: overview.yourAreas };
	const audience = {
		guild,
		guilds: me.data?.guilds ?? [],
		isOwner: me.data?.isOwner === true,
		mayGrant: mayGrant(overview),
	};
	const user = me.data?.user ?? null;

	useEffect(() => {
		setMenuOpen(false);
	}, [location.pathname]);

	return (
		<UndoProvider>
			<div className="flex min-h-dvh flex-col md:flex-row">
				<RouteAnnouncer />

				<a
					href="#content"
					className="bg-primary text-primary-foreground sr-only rounded-chip px-3 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
				>
					{t("nav.skipToContent")}
				</a>

				<MobileNav
					{...audience}
					user={user}
					bot={bot}
					open={menuOpen}
					onOpenChange={setMenuOpen}
					onSearch={openSearch}
				/>
				<Sidebar {...audience} user={user} bot={bot} onSearch={openSearch} />
				{searching && <QuickSearch {...audience} onClose={closeSearch} />}

				{/* Keyed on the path so each screen mounts afresh, and `min-w-0` because a flex item will not otherwise shrink below its content. */}
				<main
					id="content"
					key={location.pathname}
					className="mx-auto flex w-full max-w-[1100px] min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6"
				>
					<NoticeBanner />
					<Outlet />
				</main>
			</div>
		</UndoProvider>
	);
}
