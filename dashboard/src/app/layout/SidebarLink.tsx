import { type ReactNode } from "react";
import { NavLink } from "react-router";
import { cn } from "@/lib/cn";

/**
 * The active marker is a bar on the leading edge rather than a fill alone, so the current section is still
 * obvious at the icon-only width where the label is hidden.
 */
export function SidebarLink({
	to,
	icon,
	label,
	end = true,
}: {
	to: string;
	icon: ReactNode;
	label: string;
	end?: boolean;
}): React.JSX.Element {
	return (
		<NavLink
			to={to}
			end={end}
			title={label}
			className={({ isActive }) =>
				cn(
					"group relative flex items-center gap-3 rounded-[0.625rem] px-2 py-2 text-sm",
					"transition-colors duration-150",
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
					<span aria-hidden="true" className="shrink-0">
						{icon}
					</span>
					<span className="hidden truncate lg:inline">{label}</span>
				</>
			)}
		</NavLink>
	);
}
