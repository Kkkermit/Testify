import { type OwnerGuildDetail } from "@testify/shared";
import { BarChart3, ExternalLink, LogOut, X } from "lucide-react";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router";
import { FIELD, Field, Warning } from "@/components/form";
import { Avatar, Badge, Button, Card, DataList, Figure, Skeleton } from "@/components/primitives";
import { useGuildDetail, useLeaveGuild } from "@/features/owner/useControl";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/datetime";
import { formatNumber } from "@/lib/intl";

/** One server at a glance, opened from the fleet table rather than by hunting for its id. */
export function GuildDetail({ guildId, onClose }: { guildId: string; onClose: () => void }): React.JSX.Element {
	const { t } = useTranslation();
	const detail = useGuildDetail(guildId);

	if (detail.isPending || detail.data === undefined) return <Skeleton className="h-64 w-full" />;

	const guild = detail.data;

	return (
		<Card className="motion-pop flex flex-col gap-4">
			<div className="flex items-start gap-3">
				<Avatar name={guild.name} url={guild.iconUrl} size={40} seed={guild.id} />
				<div className="min-w-0 flex-1">
					<h3 className="truncate text-base font-semibold">{guild.name}</h3>
					<p className="text-muted-foreground font-mono text-xs">{guild.id}</p>
				</div>
				<Button variant="ghost" onClick={onClose} aria-label={t("owner.closeGuild", { name: guild.name })}>
					<X size={15} aria-hidden="true" />
				</Button>
			</div>

			<dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<Figure size="md" label={t("owner.members")} value={formatNumber(guild.memberCount)} />
				<Figure size="md" label={t("overview.channels")} value={String(guild.channelCount)} />
				<Figure size="md" label={t("owner.commands30d")} value={formatNumber(guild.usage)} />
				<Figure size="md" label={t("owner.dashboard30d")} value={formatNumber(guild.dashboardViews)} />
			</dl>

			<DataList
				dense
				rows={[
					{
						label: t("owner.joined"),
						value: guild.joinedAt === null ? t("owner.unknown") : shortDate(guild.joinedAt),
					},
					{ label: t("owner.created"), value: shortDate(guild.createdAt) },
					{ label: t("overview.roles"), value: formatNumber(guild.roleCount) },
					{ label: t("owner.serverOwner"), value: guild.ownerId, mono: true },
					{ label: t("owner.nickname"), value: guild.nickname ?? t("owner.noneSet") },
					{ label: t("owner.topRole"), value: guild.highestRole ?? t("owner.none") },
				]}
			/>

			<div className="flex flex-wrap items-center gap-2">
				<span className="text-muted-foreground text-sm">{t("owner.configured")}</span>
				{guild.configured.length === 0 ? (
					<Badge tone="warning">{t("owner.nothingSetUp")}</Badge>
				) : (
					guild.configured.map((feature) => <Badge key={feature}>{feature}</Badge>)
				)}
			</div>

			{guild.missingPermissions.length > 0 && (
				<Warning>{t("owner.missingHere", { permissions: guild.missingPermissions.join(", ") })}</Warning>
			)}

			<div className="flex flex-wrap gap-x-6 gap-y-2">
				<Link
					to={`?tab=usage&guild=${guild.id}`}
					className="text-accent inline-flex items-center gap-2 text-sm hover:underline"
				>
					{t("owner.seeWhoRan")}
					<BarChart3 size={14} aria-hidden="true" />
				</Link>
				<Link to={`/guilds/${guild.id}`} className="text-accent inline-flex items-center gap-2 text-sm hover:underline">
					{t("owner.openSettings")}
					<ExternalLink size={14} aria-hidden="true" />
				</Link>
			</div>

			<LeaveServer guild={guild} onLeft={onClose} />
		</Card>
	);
}

/** Leaving needs a fresh invite to undo, so this asks for the name; the server checks it too. */
function LeaveServer({ guild, onLeft }: { guild: OwnerGuildDetail; onLeft: () => void }): React.JSX.Element {
	const { t } = useTranslation();
	const leave = useLeaveGuild(guild.id);
	const [confirm, setConfirm] = useState("");
	const inputId = `leave-${guild.id}`;

	return (
		<div className="border-border flex flex-col gap-3 border-t pt-4">
			<div>
				<h4 className="text-sm font-semibold">{t("owner.leaveServer")}</h4>
				<p className="text-muted-foreground text-sm">{t("owner.leaveBody")}</p>
			</div>

			<Field
				htmlFor={inputId}
				label={
					<Trans
						i18nKey="owner.typeToConfirm"
						values={{ name: guild.name }}
						components={{ name: <span className="text-foreground font-mono" /> }}
					/>
				}
			>
				<div className="flex flex-wrap items-center gap-2">
					<input
						id={inputId}
						value={confirm}
						autoComplete="off"
						onChange={(event) => {
							setConfirm(event.target.value);
						}}
						className={cn(FIELD, "max-w-64")}
					/>
					<Button
						variant="destructive"
						disabled={confirm !== guild.name || leave.isPending}
						onClick={() => {
							leave.mutate(confirm, { onSuccess: onLeft });
						}}
					>
						<LogOut size={15} aria-hidden="true" />
						{t("owner.leave")}
					</Button>
				</div>
			</Field>

			{leave.error !== null && (
				<Warning>{leave.error instanceof ApiError ? leave.error.message : t("owner.couldNotLeave")}</Warning>
			)}
		</div>
	);
}
