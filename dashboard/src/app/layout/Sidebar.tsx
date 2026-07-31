import { useQueryClient } from "@tanstack/react-query";
import { type DashboardUser } from "@testify/shared";
import { LogOut } from "lucide-react";
import { Link } from "react-router";
import { SidebarLink } from "@/app/layout/SidebarLink";
import { Logo } from "@/components/brand/Logo";
import { GuildIcon, Tooltip } from "@/components/primitives";
import { navigationFor, type NavAudience } from "@/config/navigation";
import { api } from "@/lib/api";
import { hardRedirect } from "@/lib/redirect";

/** Icons only below `lg`, full width above it. The drawer on a phone renders the same thing at full width. */
export function Sidebar({
	user,
	guild,
	isOwner,
	expanded = false,
	onNavigate,
}: NavAudience & {
	user: DashboardUser | null;
	/** True inside the mobile drawer, where there is room for the labels. */
	expanded?: boolean;
	onNavigate?: () => void;
}): React.JSX.Element {
	const queryClient = useQueryClient();

	async function signOut(): Promise<void> {
		await api.post("/auth/logout");
		queryClient.clear();
		hardRedirect("/sign-in");
	}

	return (
		<nav
			aria-label="Sections"
			onClick={onNavigate}
			className={cnSidebar(expanded)}
			data-testid={expanded ? "sidebar-drawer" : "sidebar"}
		>
			<Link to="/guilds" className="rounded-card mb-6 flex items-center gap-2 px-1 py-1">
				<Logo size={22} className="text-accent" />
				<span
					className={expanded ? "font-semibold tracking-tight" : "sr-only font-semibold tracking-tight lg:not-sr-only"}
				>
					Testify
				</span>
			</Link>

			{navigationFor({ guild, isOwner }).map((item) => (
				<SidebarLink key={item.to} item={item} expanded={expanded} />
			))}

			<div className="mt-auto flex flex-col gap-2 pt-4">
				{user !== null && (
					<div className="flex items-center gap-2 px-1">
						<GuildIcon name={user.username} url={user.avatarUrl} size={28} seed={user.id} />
						<span className={expanded ? "truncate text-sm" : "sr-only truncate text-sm lg:not-sr-only"}>
							{user.username}
						</span>
					</div>
				)}

				<Tooltip label="Sign out of the dashboard" placement="right">
					<button
						type="button"
						onClick={() => void signOut()}
						className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-card flex items-center gap-3 px-2 py-2 text-sm transition-colors duration-150"
					>
						<LogOut size={18} aria-hidden="true" className="shrink-0" />
						<span className={expanded ? "" : "sr-only lg:not-sr-only"}>Sign out</span>
					</button>
				</Tooltip>
			</div>
		</nav>
	);
}

/** Opaque in the drawer — a translucent panel over the page it covers is unreadable. */
function cnSidebar(expanded: boolean): string {
	const base = "border-border flex shrink-0 flex-col p-3";
	return expanded
		? `${base} bg-card h-full w-64 border-r`
		: `${base} bg-card/80 hidden w-16 border-r backdrop-blur-sm md:flex lg:w-60`;
}
