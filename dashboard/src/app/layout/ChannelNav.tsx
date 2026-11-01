import { type ChannelKind } from "@testify/shared";
import { ChevronDown, Hash, type LucideIcon, Megaphone, Volume2 } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { ICON_SLOT } from "@/app/layout/sidebarStyles";
import { type ChannelGroup, channelPath, channelTree, featureCounts } from "@/features/channels/channelMap.utils";
import { usePlaces } from "@/features/channels/usePlaces";
import { useChannels } from "@/features/levelling/useLevelling";
import { cn } from "@/lib/cn";

const KIND_ICONS: Partial<Record<ChannelKind, LucideIcon>> = { text: Hash, announcement: Megaphone, voice: Volume2 };

/** Discord's own spelling of a category heading, since the names are the server's rather than ours. */
export const CATEGORY_HEADING = "text-muted-foreground text-xs font-semibold tracking-wide uppercase";

/** The server's channels as Discord lists them, each linking to what the bot does there. */
export function ChannelNav({ guildId, expanded = false }: { guildId: string; expanded?: boolean }): React.JSX.Element {
	const { t } = useTranslation();
	const channels = useChannels(guildId);
	const places = usePlaces(guildId);

	// The rail has no room for names, and a column of identical # icons says nothing.
	const shell = cn("flex flex-col gap-2 py-2", expanded ? "" : "hidden lg:flex");

	if (channels.isError) {
		return (
			<div className={shell}>
				<p className="text-muted-foreground px-2 text-sm">{t("nav.channelsFailed")}</p>
				<button
					type="button"
					onClick={() => void channels.refetch()}
					className="text-accent self-start px-2 text-sm underline-offset-4 hover:underline"
				>
					{t("common.retry")}
				</button>
			</div>
		);
	}

	if (channels.data === undefined) return <div className={shell} aria-busy="true" />;

	const counts = featureCounts(places.data?.features ?? []);

	return (
		<div className={shell}>
			<ul aria-label={t("nav.channels")} className="flex flex-col gap-2">
				{channelTree(channels.data).map((group) => (
					<CategoryGroup key={group.category?.id ?? "loose"} group={group} guildId={guildId} counts={counts} />
				))}
			</ul>
		</div>
	);
}

function CategoryGroup({
	group,
	guildId,
	counts,
}: {
	group: ChannelGroup;
	guildId: string;
	counts: Map<string, number>;
}): React.JSX.Element {
	const { t } = useTranslation();
	const [open, setOpen] = useState(true);
	const listId = useId();
	const name = group.category?.name ?? null;

	const rows = (
		<ul id={listId} className={cn("flex flex-col", open ? "" : "hidden")}>
			{group.channels.map((channel) => {
				const Icon = KIND_ICONS[channel.kind] ?? Hash;
				const count = counts.get(channel.id) ?? 0;
				return (
					<li key={channel.id}>
						<NavLink
							to={channelPath(guildId, channel.id)}
							className={({ isActive }) =>
								cn(
									"rounded-field flex items-center gap-3 px-2 py-1.5 text-sm transition-colors duration-150",
									isActive ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-card/60",
								)
							}
						>
							<span aria-hidden="true" className={ICON_SLOT}>
								<Icon size={16} />
							</span>
							<span className="flex-1 truncate">{channel.name}</span>
							{count > 0 && (
								<span className="text-muted-foreground text-xs tabular-nums">
									<span aria-hidden="true">{count}</span>
									<span className="sr-only">{t("nav.channelFeatures", { n: count })}</span>
								</span>
							)}
						</NavLink>
					</li>
				);
			})}
		</ul>
	);

	// A category the reader cannot see keeps its channels together without naming it.
	if (name === null) return <li>{rows}</li>;

	return (
		<li>
			<button
				type="button"
				aria-expanded={open}
				aria-controls={listId}
				onClick={() => {
					setOpen((was) => !was);
				}}
				className={cn(CATEGORY_HEADING, "hover:text-foreground flex w-full items-center gap-1 px-2 py-1 text-left")}
			>
				<ChevronDown
					size={12}
					aria-hidden="true"
					className={cn("shrink-0 transition-transform duration-150", open ? "" : "-rotate-90")}
				/>
				<span className="truncate">{name}</span>
			</button>
			{rows}
		</li>
	);
}
