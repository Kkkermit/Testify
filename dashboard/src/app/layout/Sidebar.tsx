import { useQueryClient } from "@tanstack/react-query";
import { type BotIdentity, type DashboardUser } from "@testify/shared";
import { LogOut } from "lucide-react";
import { Link } from "react-router";
import { SidebarLink } from "@/app/layout/SidebarLink";
import { BotMark } from "@/components/brand/BotMark";
import { GuildIcon, Tooltip } from "@/components/primitives";
import { navigationFor, type NavAudience } from "@/config/navigation";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { hardRedirect } from "@/lib/redirect";

/**
 * Icons only below `lg`, full width above it; the drawer on a phone renders the same thing at full width.
 *
 * Every row — the wordmark, the links, the account, the sign-out — shares `ROW`, so all four icons sit on one
 * vertical line and all four labels on another.
 */
const ROW = "flex items-center gap-3 rounded-card px-2 py-2";

export function Sidebar({
	user,
	bot,
	guild,
	isOwner,
	expanded = false,
	onNavigate,
}: NavAudience & {
	user: DashboardUser | null;
	/** The bot's own profile, so a fork's sidebar carries its identity rather than Testify's. */
	bot?: BotIdentity | undefined;
	/** True inside the mobile drawer, where there is room for the labels. */
	expanded?: boolean;
	onNavigate?: () => void;
}): React.JSX.Element {
	const queryClient = useQueryClient();
	const label = (extra = ""): string => cn(expanded ? "" : "sr-only lg:not-sr-only", extra);

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
			<Link to="/guilds" className={cn(ROW, "mb-4")}>
				{/* Boxed to 18px like every other row icon, so the wordmark starts on the label column too. */}
				<span aria-hidden="true" className="flex w-[18px] shrink-0 justify-center">
					<BotMark src={bot?.avatarUrl} size={22} />
				</span>
				<span className={label("truncate font-semibold tracking-tight")}>{bot?.username ?? "Testify"}</span>
			</Link>

			<div className="flex flex-col gap-1">
				{navigationFor({ guild, isOwner }).map((item) => (
					<SidebarLink key={item.to} item={item} expanded={expanded} />
				))}
			</div>

			<div className="border-border mt-auto flex flex-col gap-1 border-t pt-3">
				{user !== null && (
					<div className={ROW}>
						<span aria-hidden="true" className="flex w-[18px] shrink-0 justify-center">
							<GuildIcon name={user.username} url={user.avatarUrl} size={26} seed={user.id} />
						</span>
						<span className={label("truncate text-sm")}>{user.username}</span>
					</div>
				)}

				<Tooltip label="Sign out of the dashboard" placement="right">
					<button
						type="button"
						onClick={() => void signOut()}
						className={cn(
							ROW,
							"text-muted-foreground hover:text-foreground hover:bg-muted text-sm transition-colors duration-150",
						)}
					>
						<LogOut size={18} aria-hidden="true" className="shrink-0" />
						<span className={label("truncate")}>Sign out</span>
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
