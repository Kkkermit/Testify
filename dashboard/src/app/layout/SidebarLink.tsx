import { NavLink } from "react-router";
import { Tooltip } from "@/components/primitives";
import { type NavItem } from "@/config/navigation";
import { cn } from "@/lib/cn";

/**
 * The label is `sr-only` at the icon-only width rather than `hidden`, so the link keeps its accessible name on
 * a narrow screen — `hidden` removes it from the accessibility tree and leaves a link called nothing. The
 * tooltip is the sighted half of the same job, and adds nothing a screen reader needs.
 */
export function SidebarLink({ item, expanded = false }: { item: NavItem; expanded?: boolean }): React.JSX.Element {
	const { to, label, icon: Icon, hint, exact = true } = item;

	return (
		<Tooltip label={hint ?? label} placement="right">
			<NavLink
				to={to}
				end={exact}
				className={({ isActive }) =>
					cn(
						"rounded-card group relative flex items-center gap-3 px-2 py-2 text-sm transition-colors duration-150",
						isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
					)
				}
			>
				{({ isActive }) => (
					<>
						<span
							aria-hidden="true"
							className={cn(
								"bg-primary absolute top-1/2 left-0 w-0.5 -translate-y-1/2 rounded-full transition-all duration-200 ease-out",
								isActive ? "h-5 opacity-100" : "h-0 opacity-0",
							)}
						/>
						<Icon size={18} aria-hidden="true" className="shrink-0" />
						<span className={expanded ? "truncate" : "sr-only truncate lg:not-sr-only"}>{label}</span>
					</>
				)}
			</NavLink>
		</Tooltip>
	);
}
