import { type ChannelSummary, type FeaturePlaces } from "@testify/shared";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { SELECT, Warning } from "@/components/form";
import { channelPath, placeableIn } from "@/features/channels/channelMap.utils";
import { usePlace } from "@/features/channels/usePlace";
import { ApiError } from "@/lib/api";

/** Moves a feature that lives in one channel to another, through the same write that placed it. */
export function MoveTo({
	feature,
	channelId,
	channels,
	guildId,
}: {
	feature: FeaturePlaces;
	channelId: string;
	channels: readonly ChannelSummary[];
	guildId: string;
}): React.JSX.Element | null {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const place = usePlace(guildId);
	const id = useId();
	if (feature.accepts === null) return null;
	const choices = placeableIn(channels, feature.accepts);

	return (
		<div className="flex flex-col gap-2">
			<label htmlFor={id} className="text-muted-foreground flex items-center gap-2 text-sm whitespace-nowrap">
				{t("channel.moveTo")}
				<select
					id={id}
					value={channelId}
					disabled={place.isPending}
					className={`${SELECT} w-auto`}
					onChange={(event) => {
						const target = event.target.value;
						place.mutate(
							{ feature: feature.key, channelId: target },
							{ onSuccess: () => void navigate(channelPath(guildId, target)) },
						);
					}}
				>
					{choices.every((channel) => channel.id !== channelId) && (
						<option value={channelId}>{t("channel.thisChannel")}</option>
					)}
					{choices.map((channel) => (
						<option key={channel.id} value={channel.id}>
							{channel.kind === "voice" ? channel.name : `#${channel.name}`}
						</option>
					))}
				</select>
			</label>
			{place.error !== null && (
				<Warning>{place.error instanceof ApiError ? place.error.message : t("common.couldNotSave")}</Warning>
			)}
		</div>
	);
}
