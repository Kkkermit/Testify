import { useEffect, useState } from "react";
import { Outlet, useLocation, useParams } from "react-router";
import { MobileNav } from "@/app/layout/MobileNav";
import { Sidebar } from "@/app/layout/Sidebar";
import { RouteAnnouncer } from "@/app/RouteAnnouncer";
import { Backdrop } from "@/components/motion";
import { useBot } from "@/features/auth/useBot";
import { useMe } from "@/features/auth/useMe";
import { useScreenView } from "@/hooks/useScreenView";

/** Navigation, backdrop and the outlet. */
export function AppShell(): React.JSX.Element {
	const me = useMe();
	const bot = useBot();
	const { guildId } = useParams();
	const location = useLocation();
	const [menuOpen, setMenuOpen] = useState(false);

	useScreenView();

	const guild = me.data?.guilds.find((candidate) => candidate.id === guildId);
	const audience = { guild, isOwner: me.data?.isOwner === true };
	const user = me.data?.user ?? null;

	// A drawer left open across a navigation covers the page it just moved to.
	useEffect(() => {
		setMenuOpen(false);
	}, [location.pathname]);

	return (
		<div className="flex min-h-dvh flex-col md:flex-row">
			{/* Dimmer than the sign-in screen: behind a settings form it is a texture, not the subject. */}
			<Backdrop opacity={0.22} />
			<RouteAnnouncer />

			<a
				href="#content"
				className="bg-primary text-primary-foreground sr-only rounded px-3 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
			>
				Skip to content
			</a>

			<MobileNav {...audience} user={user} bot={bot.data} open={menuOpen} onOpenChange={setMenuOpen} />
			<Sidebar {...audience} user={user} bot={bot.data} />

			{/* Keyed on the path so each screen fades in on arrival, and `min-w-0` because a flex item will not otherwise shrink below its content. */}
			<main
				id="content"
				key={location.pathname}
				className="motion-fade mx-auto flex w-full max-w-[1100px] min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6"
			>
				<Outlet />
			</main>
		</div>
	);
}
