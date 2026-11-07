import { BIRTHDAY_LIMITS, BIRTHDAY_PLACEHOLDERS, type ChannelSummary, type FeaturePlaces } from "@testify/shared";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { Badge, Card, CARD_HEADING, Skeleton } from "@/components/primitives";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { featureLook } from "@/config/features";
import { mayOpen } from "@/config/navigation";
import { useBirthdays, useUpdateBirthdays } from "@/features/birthdays/useBirthdays";
import { EditablePost } from "@/features/channels/components/EditablePost";
import { ROLE_LABELS } from "@/features/channels/place.labels";
import { describeDetail, featureLabel } from "@/features/guild-overview/featureStatus.labels";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useGoodbye, useUpdateGoodbye } from "@/features/welcome/useGoodbye";
import { useUpdateWelcome, useWelcome } from "@/features/welcome/useWelcome";
import { channelLabel } from "@/lib/channels";
import { cn } from "@/lib/cn";

interface BlockProps {
	feature: FeaturePlaces;
	channelId: string;
	channels: readonly ChannelSummary[];
	guildId: string;
}

export function ChannelBlocks({
	features,
	...rest
}: Omit<BlockProps, "feature"> & { features: readonly FeaturePlaces[] }): React.JSX.Element {
	return (
		<div className="flex flex-col gap-4">
			{features.map((feature) => (
				<ChannelBlock key={feature.key} feature={feature} {...rest} />
			))}
		</div>
	);
}

function ChannelBlock({ feature, channelId, channels, guildId }: BlockProps): React.JSX.Element {
	const { t } = useTranslation();
	const headingId = useId();
	const { path } = featureLook(feature.key);
	const areas = useGuildOverview(guildId).data?.yourAreas;
	const page = path?.(guildId);
	const reachable = page !== undefined && mayOpen(page, guildId, areas);
	const name = featureLabel(feature.key, feature.label, t);
	const roles = feature.places
		.filter((place) => place.channelId === channelId)
		.map((place) => t(ROLE_LABELS[place.role]))
		.join(" · ");

	return (
		<Card padding="none">
			<section aria-labelledby={headingId}>
				<div className="border-border flex flex-wrap items-center gap-3 border-b px-6 py-3">
					<h2 id={headingId} className={CARD_HEADING}>
						{name}
					</h2>
					<Badge tone={feature.enabled ? "success" : "muted"}>
						{feature.enabled ? t("common.on") : t("common.off")}
					</Badge>
					<span className="text-muted-foreground text-sm">{roles}</span>
					<div className="ml-auto flex flex-wrap items-center gap-3">
						{reachable && (
							<Link
								to={page}
								aria-label={t("channel.openPageLabel", { feature: name })}
								className={cn(INLINE_TARGET, "text-accent text-sm underline-offset-4 hover:underline")}
							>
								{t("channel.openPage")}
							</Link>
						)}
					</div>
				</div>
				<div className="p-6">
					<BlockBody feature={feature} channels={channels} guildId={guildId} editable={reachable} />
				</div>
			</section>
		</Card>
	);
}

/** A post is edited where it is shown only by somebody who may open its own screen. */
function BlockBody({
	feature,
	channels,
	guildId,
	editable,
}: Omit<BlockProps, "channelId"> & { editable: boolean }): React.JSX.Element {
	const { t } = useTranslation();

	if (editable && feature.key === "welcome") return <WelcomePost guildId={guildId} />;
	if (editable && feature.key === "goodbye") return <GoodbyePost guildId={guildId} />;
	if (editable && feature.key === "birthdays") return <BirthdayPost guildId={guildId} />;

	return (
		<p className="text-muted-foreground text-sm">
			{feature.detail === null
				? t("overview.notSetUp")
				: describeDetail(feature.detail, t, (id) => channelLabel(channels, id, t))}
		</p>
	);
}

function WelcomePost({ guildId }: { guildId: string }): React.JSX.Element {
	const welcome = useWelcome(guildId);
	const update = useUpdateWelcome(guildId);
	const overview = useGuildOverview(guildId);

	if (welcome.isError) return <ErrorState as="h2" error={welcome.error} onRetry={() => void welcome.refetch()} />;
	if (welcome.data === undefined || overview.data === undefined) return <Skeleton className="h-24" />;

	return (
		<EditablePost
			id="welcome-message"
			testOf={(message) => ({ kind: "greeting", message, style: welcome.data.style })}
			message={welcome.data.message}
			style={welcome.data.style}
			guildName={overview.data.name}
			memberCount={overview.data.memberCount}
			saving={update.isPending}
			error={update.error}
			onSave={(message, done) => {
				update.mutate({ message }, { onSuccess: done });
			}}
		/>
	);
}

function GoodbyePost({ guildId }: { guildId: string }): React.JSX.Element {
	const goodbye = useGoodbye(guildId);
	const update = useUpdateGoodbye(guildId);
	const overview = useGuildOverview(guildId);

	if (goodbye.isError) return <ErrorState as="h2" error={goodbye.error} onRetry={() => void goodbye.refetch()} />;
	if (goodbye.data === undefined || overview.data === undefined) return <Skeleton className="h-24" />;

	return (
		<EditablePost
			id="goodbye-message"
			testOf={(message) => ({ kind: "goodbye", message, style: goodbye.data.style })}
			message={goodbye.data.message}
			style={goodbye.data.style}
			leaving
			guildName={overview.data.name}
			memberCount={overview.data.memberCount}
			saving={update.isPending}
			error={update.error}
			onSave={(message, done) => {
				update.mutate({ message }, { onSuccess: done });
			}}
		/>
	);
}

function BirthdayPost({ guildId }: { guildId: string }): React.JSX.Element {
	const birthdays = useBirthdays(guildId);
	const update = useUpdateBirthdays(guildId);
	const overview = useGuildOverview(guildId);

	if (birthdays.isError) return <ErrorState as="h2" error={birthdays.error} onRetry={() => void birthdays.refetch()} />;
	if (birthdays.data === undefined || overview.data === undefined) return <Skeleton className="h-24" />;

	return (
		<EditablePost
			id="birthday-message"
			testOf={(message) => ({ kind: "birthday", message })}
			message={birthdays.data.message}
			guildName={overview.data.name}
			memberCount={overview.data.memberCount}
			tokens={BIRTHDAY_PLACEHOLDERS}
			max={BIRTHDAY_LIMITS.maxMessage}
			saving={update.isPending}
			error={update.error}
			onSave={(message, done) => {
				update.mutate({ message }, { onSuccess: done });
			}}
		/>
	);
}
