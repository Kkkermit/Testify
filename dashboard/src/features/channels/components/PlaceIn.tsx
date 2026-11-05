import { type ChannelSummary, type FeaturePlaces } from "@testify/shared";
import { useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Warning } from "@/components/form";
import { channelPath, placeableIn } from "@/features/channels/channelMap.utils";
import { usePlace } from "@/features/channels/usePlace";
import { featureLabel } from "@/features/guild-overview/featureStatus.labels";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";

const SMALL_BUTTON =
	"border-border hover:bg-muted rounded-field border px-2.5 py-1 text-sm transition-colors duration-150";

/** The keyboard's way to do what dragging a chip onto a channel does: a list of the channels that can take it. */
export function PlaceIn({
	feature,
	channels,
	guildId,
}: {
	feature: FeaturePlaces;
	channels: readonly ChannelSummary[];
	guildId: string;
}): React.JSX.Element {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const place = usePlace(guildId);
	const [open, setOpen] = useState(false);
	const listId = useId();
	const opener = useRef<HTMLButtonElement>(null);
	const name = featureLabel(feature.key, feature.label, t);
	const choices = feature.accepts === null ? [] : placeableIn(channels, feature.accepts);

	return (
		<div className="flex flex-col gap-2">
			<button
				ref={opener}
				type="button"
				aria-expanded={open}
				aria-controls={listId}
				aria-label={t("channel.placeInLabel", { feature: name })}
				onClick={() => {
					setOpen((was) => !was);
				}}
				className={SMALL_BUTTON}
			>
				{t("channel.placeIn")}
			</button>
			<ul
				id={listId}
				className={cn(
					"bg-popover border-border rounded-field max-h-56 overflow-y-auto border p-1",
					open ? "" : "hidden",
				)}
				onKeyDown={(event) => {
					if (event.key !== "Escape") return;
					setOpen(false);
					opener.current?.focus();
				}}
			>
				{choices.length === 0 && (
					<li className="text-muted-foreground px-2 py-1 text-sm">{t("channel.noChannelFits")}</li>
				)}
				{choices.map((channel) => (
					<li key={channel.id}>
						<button
							type="button"
							disabled={place.isPending}
							onClick={() => {
								place.mutate(
									{ feature: feature.key, channelId: channel.id },
									{ onSuccess: () => void navigate(channelPath(guildId, channel.id)) },
								);
							}}
							className="hover:bg-muted rounded-chip w-full px-2 py-1 text-left text-sm"
						>
							{channel.kind === "voice" ? channel.name : `#${channel.name}`}
						</button>
					</li>
				))}
			</ul>
			{place.error !== null && (
				<Warning>{place.error instanceof ApiError ? place.error.message : t("common.couldNotSave")}</Warning>
			)}
		</div>
	);
}
