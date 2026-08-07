import { useQueryClient } from "@tanstack/react-query";
import { type BotIdentity, type DashboardUser } from "@testify/shared";
import { FileText, LogOut, ShieldQuestion } from "lucide-react";
import { Link } from "react-router";
import { SidebarLink } from "@/app/layout/SidebarLink";
import { SidebarSection } from "@/app/layout/SidebarSection";
import { BotMark } from "@/components/brand/BotMark";
import { GuildIcon, Tooltip } from "@/components/primitives";
import { navigationFor, type NavAudience } from "@/config/navigation";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { hardRedirect } from "@/lib/redirect";

/** Every row shares `ROW`, so all four icons sit on one vertical line and all four labels on another. */
const ROW = "flex items-center gap-3 rounded-card px-2 py-2";

const LEGAL = [
	{ to: "/terms", label: "Terms", icon: FileText },
	{ to: "/privacy", label: "Privacy", icon: ShieldQuestion },
] as const;

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

			{navigationFor({ guild, isOwner }).map((group, index) => (
				<div key={group.heading ?? "global"} className={index > 0 ? "mt-4" : undefined}>
					{group.heading !== undefined && (
						<>
							{/* At the icon-only width the rule carries the grouping, where there is no room for the words. */}
							<hr className="border-border mx-2 mb-2 lg:hidden" />
							{/* Shown but not a heading: the list's own label names the group, so the page's heading outline stays the page's. */}
							<p
								aria-hidden="true"
								className={cn(
									"text-muted-foreground truncate px-2 pb-1 text-[0.6875rem] font-semibold tracking-wider uppercase",
									expanded ? "" : "hidden lg:block",
								)}
							>
								{group.heading}
							</p>
						</>
					)}
					<ul className="flex flex-col gap-1" {...(group.heading === undefined ? {} : { "aria-label": group.heading })}>
						{group.items.map((item) => (
							<li key={item.to}>
								<SidebarLink item={item} expanded={expanded} />
							</li>
						))}
						{(group.sections ?? []).map((section) => (
							<SidebarSection key={section.label} section={section} expanded={expanded} />
						))}
					</ul>
				</div>
			))}

			<div className="border-border mt-auto flex flex-col gap-1 border-t pt-3">
				{user !== null && (
					<div className={ROW}>
						<span aria-hidden="true" className="flex w-[18px] shrink-0 justify-center">
							<GuildIcon name={user.username} url={user.avatarUrl} size={26} seed={user.id} />
						</span>
						<span className={label("truncate text-sm")}>{user.username}</span>
					</div>
				)}

				{/* Rows rather than small links, because `hidden` at the icon-only width took these two off the page entirely. */}
				{LEGAL.map(({ to, label: text, icon: Icon }) => (
					<Tooltip key={to} label={`Read the ${text.toLowerCase()}`} placement="right">
						<Link
							to={to}
							className={cn(
								ROW,
								"text-muted-foreground hover:text-foreground hover:bg-muted text-sm transition-colors duration-150",
							)}
						>
							<Icon size={18} aria-hidden="true" className="shrink-0" />
							<span className={label("truncate")}>{text}</span>
						</Link>
					</Tooltip>
				))}

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

/** Opaque in the drawer, and capped to the viewport in the rail — a flex child otherwise stretches to a container that grows with the page. */
function cnSidebar(expanded: boolean): string {
	const base = "border-border flex shrink-0 flex-col p-3";
	return expanded
		? `${base} bg-card h-full w-64 border-r`
		: `${base} bg-card/80 scrollbar-none sticky top-0 hidden h-dvh w-16 overflow-y-auto border-r backdrop-blur-sm md:flex lg:w-60`;
}
