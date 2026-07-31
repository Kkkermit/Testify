import { useQueryClient } from "@tanstack/react-query";
import { type ManageableGuild, type DashboardUser } from "@testify/shared";
import { LayoutGrid, LogOut, Server, ShieldCheck, TrendingUp } from "lucide-react";
import { Link } from "react-router";
import { SidebarLink } from "@/app/layout/SidebarLink";
import { GuildIcon } from "@/components/primitives";
import { api } from "@/lib/api";
import { hardRedirect } from "@/lib/redirect";

/** 240px fixed, collapsing to icons on narrow screens. */
export function Sidebar({
	user,
	guild,
	isOwner,
}: {
	user: DashboardUser | null;
	guild: ManageableGuild | undefined;
	isOwner: boolean;
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
			className="border-border bg-card/80 flex w-16 shrink-0 flex-col border-r p-3 backdrop-blur-sm lg:w-60"
		>
			<Link to="/guilds" className="mb-6 flex items-center gap-2 px-1 py-1">
				<ShieldCheck className="text-accent shrink-0" size={22} aria-hidden="true" />
				<span className="hidden font-semibold tracking-tight lg:inline">Testify</span>
			</Link>

			<SidebarLink to="/guilds" icon={<LayoutGrid size={18} />} label="Servers" />
			{guild !== undefined && (
				<SidebarLink to={`/guilds/${guild.id}`} icon={<Server size={18} />} label={guild.name} end={false} />
			)}
			{guild !== undefined && (
				<SidebarLink to={`/guilds/${guild.id}/levelling`} icon={<TrendingUp size={18} />} label="Levelling" />
			)}
			{isOwner && <SidebarLink to="/owner" icon={<ShieldCheck size={18} />} label="Owner" />}

			<div className="mt-auto flex flex-col gap-2 pt-4">
				{user !== null && (
					<div className="flex items-center gap-2 px-1">
						<GuildIcon name={user.username} url={user.avatarUrl} size={28} />
						<span className="hidden truncate text-sm lg:inline">{user.username}</span>
					</div>
				)}
				<button
					type="button"
					onClick={() => void signOut()}
					className="text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-3 rounded-[0.625rem] px-2 py-2 text-sm transition-colors duration-150"
				>
					<LogOut size={18} aria-hidden="true" />
					<span className="hidden lg:inline">Sign out</span>
				</button>
			</div>
		</nav>
	);
}
