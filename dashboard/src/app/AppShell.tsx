import { useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, LogOut, Server, ShieldCheck } from "lucide-react";
import { Link, NavLink, Outlet, useParams } from "react-router-dom";
import { GuildIcon } from "@/components/common/primitives";
import { useMe } from "@/features/auth/useMe";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { hardRedirect } from "@/lib/redirect";

/** Sidebar, header and the outlet. 240px fixed, collapsing to icons on narrow screens. */
export function AppShell(): React.JSX.Element {
	const me = useMe();
	const { guildId } = useParams();
	const queryClient = useQueryClient();
	const guild = me.data?.guilds.find((candidate) => candidate.id === guildId);

	async function signOut(): Promise<void> {
		await api.post("/auth/logout");
		queryClient.clear();
		hardRedirect("/sign-in");
	}

	return (
		<div className="flex min-h-dvh">
			<a
				href="#content"
				className="bg-primary text-primary-foreground sr-only rounded px-3 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
			>
				Skip to content
			</a>

			<nav aria-label="Sections" className="border-border bg-card flex w-16 shrink-0 flex-col border-r p-3 lg:w-60">
				<Link to="/guilds" className="mb-6 flex items-center gap-2 px-1">
					<ShieldCheck className="text-accent shrink-0" size={22} aria-hidden="true" />
					<span className="hidden font-semibold lg:inline">Testify</span>
				</Link>

				<SidebarLink to="/guilds" icon={<LayoutGrid size={18} />} label="Servers" />
				{guild !== undefined && (
					<SidebarLink to={`/guilds/${guild.id}`} icon={<Server size={18} />} label={guild.name} end={false} />
				)}
				{me.data?.isOwner === true && <SidebarLink to="/owner" icon={<ShieldCheck size={18} />} label="Owner" />}

				<div className="mt-auto flex flex-col gap-2 pt-4">
					{me.data !== null && me.data !== undefined && (
						<div className="flex items-center gap-2 px-1">
							<GuildIcon name={me.data.user.username} url={me.data.user.avatarUrl} size={28} />
							<span className="hidden truncate text-sm lg:inline">{me.data.user.username}</span>
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

			<main id="content" className="mx-auto w-full max-w-[1100px] flex-1 p-6">
				<Outlet />
			</main>
		</div>
	);
}

function SidebarLink({
	to,
	icon,
	label,
	end = true,
}: {
	to: string;
	icon: React.ReactNode;
	label: string;
	end?: boolean;
}) {
	return (
		<NavLink
			to={to}
			end={end}
			className={({ isActive }) =>
				cn(
					"flex items-center gap-3 rounded-[0.625rem] px-2 py-2 text-sm transition-colors duration-150",
					isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted",
				)
			}
		>
			<span aria-hidden="true" className="shrink-0">
				{icon}
			</span>
			<span className="hidden truncate lg:inline">{label}</span>
		</NavLink>
	);
}
