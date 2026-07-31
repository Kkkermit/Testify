import { Outlet, useLocation, useParams } from "react-router";
import { Sidebar } from "@/app/layout/Sidebar";
import { Backdrop } from "@/components/motion";
import { useMe } from "@/features/auth/useMe";

/** Sidebar, backdrop and the outlet. */
export function AppShell(): React.JSX.Element {
	const me = useMe();
	const { guildId } = useParams();
	const location = useLocation();
	const guild = me.data?.guilds.find((candidate) => candidate.id === guildId);

	return (
		<div className="flex min-h-dvh">
			{/* Dimmer than the sign-in screen: behind a settings form it is a texture, not the subject. */}
			<Backdrop opacity={0.22} />

			<a
				href="#content"
				className="bg-primary text-primary-foreground sr-only rounded px-3 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
			>
				Skip to content
			</a>

			<Sidebar user={me.data?.user ?? null} guild={guild} isOwner={me.data?.isOwner === true} />

			{/* Keyed on the path so each screen fades in on arrival rather than swapping in place. */}
			<main id="content" key={location.pathname} className="motion-fade mx-auto w-full max-w-[1100px] flex-1 p-6">
				<Outlet />
			</main>
		</div>
	);
}
