import { type ManageableGuild } from "@testify/shared";
import { ChevronsUpDown, LayoutGrid } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";
import { switchableGuilds, switchedPath } from "@/app/layout/guildSwitch.utils";
import { ICON_SLOT, ROW } from "@/app/layout/sidebarStyles";
import { Avatar, Tooltip } from "@/components/primitives";
import { cn } from "@/lib/cn";

const OPTION = cn(
	ROW,
	"text-muted-foreground hover:text-foreground hover:bg-muted/60 text-sm transition-colors duration-150",
);

/** The server group's heading, opening onto the same screen in each other server. */
export function GuildSwitcher({
	guild,
	guilds,
	expanded,
}: {
	guild: { id: string; name: string };
	guilds: readonly ManageableGuild[];
	expanded: boolean;
}): React.JSX.Element {
	const { t } = useTranslation();
	const location = useLocation();
	const listId = useId();
	const buttonRef = useRef<HTMLButtonElement>(null);
	const [open, setOpen] = useState(false);
	const others = switchableGuilds(guilds, guild.id);
	const iconUrl = guilds.find((candidate) => candidate.id === guild.id)?.iconUrl ?? null;
	const label = (extra = ""): string => cn(expanded ? "" : "sr-only lg:not-sr-only", extra);

	useEffect(() => {
		setOpen(false);
	}, [location.pathname]);

	return (
		<div
			onKeyDown={(event) => {
				if (event.key !== "Escape" || !open) return;
				// The drawer also closes on Escape, and this press was only meant for the list.
				event.stopPropagation();
				setOpen(false);
				buttonRef.current?.focus();
			}}
		>
			<Tooltip label={t("nav.switchServerHint")} placement="right">
				<button
					ref={buttonRef}
					type="button"
					aria-expanded={open}
					aria-controls={listId}
					aria-label={t("nav.switchServer", { name: guild.name })}
					onClick={() => {
						setOpen((was) => !was);
					}}
					className={cn(ROW, "hover:bg-muted/60 w-full text-left transition-colors duration-150")}
				>
					<span aria-hidden="true" className={ICON_SLOT}>
						<Avatar name={guild.name} url={iconUrl} size={20} seed={guild.id} />
					</span>
					<span className={label("flex-1 truncate text-sm font-semibold")}>{guild.name}</span>
					<ChevronsUpDown
						size={14}
						aria-hidden="true"
						className={cn("text-muted-foreground shrink-0", expanded ? "" : "hidden lg:block")}
					/>
				</button>
			</Tooltip>

			<div id={listId} hidden={!open} className="border-border mt-1 mb-2 flex flex-col gap-1 border-b pb-2">
				{others.length === 0 ? (
					<p className={label("text-muted-foreground px-2 py-1 text-sm")}>{t("nav.noOtherServers")}</p>
				) : (
					<ul aria-label={t("nav.otherServers")} className="flex max-h-64 flex-col gap-1 overflow-y-auto">
						{others.map((other) => (
							<li key={other.id}>
								<Tooltip label={other.name} placement="right">
									<Link to={switchedPath(location, other.id)} className={OPTION}>
										<span aria-hidden="true" className={ICON_SLOT}>
											<Avatar name={other.name} url={other.iconUrl} size={20} seed={other.id} />
										</span>
										<span className={label("truncate")}>{other.name}</span>
									</Link>
								</Tooltip>
							</li>
						))}
					</ul>
				)}
				<Link to="/guilds" className={OPTION}>
					<LayoutGrid size={18} aria-hidden="true" className="shrink-0" />
					<span className={label("truncate")}>{t("nav.allServers")}</span>
				</Link>
			</div>
		</div>
	);
}
