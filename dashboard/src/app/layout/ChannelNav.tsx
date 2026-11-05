import { type ChannelKind } from "@testify/shared";
import { ChevronDown, Hash, type LucideIcon, Megaphone, Volume2 } from "lucide-react";
import { type DragEvent, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useNavigate } from "react-router";
import { ICON_SLOT } from "@/app/layout/sidebarStyles";
import { Warning } from "@/components/form";
import {
	type ChannelGroup,
	channelPath,
	channelTree,
	featureCounts,
	kindOf,
	type VisibleChannel,
} from "@/features/channels/channelMap.utils";
import { DRAG_FEATURE, dragKindType } from "@/features/channels/placement";
import { usePlace } from "@/features/channels/usePlace";
import { usePlaces } from "@/features/channels/usePlaces";
import { useChannels } from "@/features/levelling/useLevelling";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";

const KIND_ICONS: Partial<Record<ChannelKind, LucideIcon>> = { text: Hash, announcement: Megaphone, voice: Volume2 };

/** Discord's own spelling of a category heading, since the names are the server's rather than ours. */
export const CATEGORY_HEADING = "text-muted-foreground text-xs font-semibold tracking-wide uppercase";

type Drop = (feature: string, channelId: string) => void;

/** The server's channels as Discord lists them, each linking to what the bot does there. */
export function ChannelNav({ guildId, expanded = false }: { guildId: string; expanded?: boolean }): React.JSX.Element {
	const { t } = useTranslation();
	const channels = useChannels(guildId);
	const places = usePlaces(guildId);
	const place = usePlace(guildId);
	const navigate = useNavigate();

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
	const onDrop: Drop = (feature, channelId) => {
		place.mutate({ feature, channelId }, { onSuccess: () => void navigate(channelPath(guildId, channelId)) });
	};

	return (
		<div className={shell}>
			<ul aria-label={t("nav.channels")} className="flex flex-col gap-2">
				{channelTree(channels.data).map((group) => (
					<CategoryGroup
						key={group.category?.id ?? "loose"}
						group={group}
						guildId={guildId}
						counts={counts}
						onDrop={onDrop}
					/>
				))}
			</ul>
			{place.error !== null && (
				<div className="px-2">
					<Warning>{place.error instanceof ApiError ? place.error.message : t("common.couldNotSave")}</Warning>
				</div>
			)}
		</div>
	);
}

function CategoryGroup({
	group,
	guildId,
	counts,
	onDrop,
}: {
	group: ChannelGroup;
	guildId: string;
	counts: Map<string, number>;
	onDrop: Drop;
}): React.JSX.Element {
	const [open, setOpen] = useState(true);
	const listId = useId();
	const name = group.category?.name ?? null;

	const rows = (
		<ul id={listId} className={cn("flex flex-col", open ? "" : "hidden")}>
			{group.channels.map((channel) => (
				<ChannelRow
					key={channel.id}
					channel={channel}
					guildId={guildId}
					count={counts.get(channel.id) ?? 0}
					onDrop={onDrop}
				/>
			))}
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

/** A channel row, and where a chip dragged from the overview lands when this channel can take it. */
function ChannelRow({
	channel,
	guildId,
	count,
	onDrop,
}: {
	channel: VisibleChannel;
	guildId: string;
	count: number;
	onDrop: Drop;
}): React.JSX.Element {
	const { t } = useTranslation();
	const [over, setOver] = useState(false);
	const Icon = KIND_ICONS[channel.kind] ?? Hash;
	// A text channel the bot cannot post in takes nothing, so the drop is refused before any request.
	const takes = (event: DragEvent): boolean =>
		event.dataTransfer.types.includes(dragKindType(kindOf(channel))) && (channel.kind === "voice" || channel.canSend);

	return (
		<li
			onDragOver={(event) => {
				if (!takes(event)) return;
				event.preventDefault();
				event.dataTransfer.dropEffect = "move";
				setOver(true);
			}}
			onDragLeave={() => {
				setOver(false);
			}}
			onDrop={(event) => {
				setOver(false);
				const feature = event.dataTransfer.getData(DRAG_FEATURE);
				if (feature === "" || !takes(event)) return;
				event.preventDefault();
				onDrop(feature, channel.id);
			}}
		>
			<NavLink
				to={channelPath(guildId, channel.id)}
				className={({ isActive }) =>
					cn(
						"rounded-field flex items-center gap-3 px-2 py-1.5 text-sm transition-colors duration-150",
						isActive ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-card/60",
						over && "outline-accent bg-accent-wash text-foreground outline-2",
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
}
