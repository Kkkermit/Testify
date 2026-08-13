import { type OwnerGuildDetail } from "@testify/shared";
import { ExternalLink, LogOut, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { FIELD, Field, Warning } from "@/components/form";
import { Avatar, Badge, Button, Card, DataList, Figure, Skeleton } from "@/components/primitives";
import { useGuildDetail, useLeaveGuild } from "@/features/owner/useControl";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/datetime";

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
				<Button variant="ghost" onClick={onClose} aria-label={`Close ${guild.name}`}>
					<X size={15} aria-hidden="true" />
				</Button>
			</div>

			<dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<Figure size="md" label={t("owner.members")} value={guild.memberCount.toLocaleString()} />
				<Figure size="md" label={t("overview.channels")} value={String(guild.channelCount)} />
				<Figure size="md" label={t("overview.roles")} value={String(guild.roleCount)} />
				<Figure size="md" label={t("owner.commands30d")} value={guild.usage.toLocaleString()} />
			</dl>

			<DataList
				dense
				rows={[
					{
						label: "Joined",
						value: guild.joinedAt === null ? "Unknown" : shortDate(guild.joinedAt),
					},
					{ label: "Created", value: shortDate(guild.createdAt) },
					{ label: "Server owner", value: guild.ownerId, mono: true },
					{ label: "Testify’s nickname", value: guild.nickname ?? "None set" },
					{ label: "Testify’s top role", value: guild.highestRole ?? "None" },
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
				<Warning>Missing in this server: {guild.missingPermissions.join(", ")}.</Warning>
			)}

			<Link to={`/guilds/${guild.id}`} className="text-accent inline-flex items-center gap-2 text-sm hover:underline">
				Open its settings
				<ExternalLink size={14} aria-hidden="true" />
			</Link>

			<LeaveServer guild={guild} onLeft={onClose} />
		</Card>
	);
}

/**
 * Leaving needs a fresh invite to undo, and only somebody still in that server can issue one — so this asks for
 * the name rather than a click. The server checks it too; this half is the warning, not the gate.
 */
function LeaveServer({ guild, onLeft }: { guild: OwnerGuildDetail; onLeft: () => void }): React.JSX.Element {
	const { t } = useTranslation();
	const leave = useLeaveGuild(guild.id);
	const [confirm, setConfirm] = useState("");
	const inputId = `leave-${guild.id}`;

	return (
		<div className="border-border flex flex-col gap-3 border-t pt-4">
			<div>
				<h4 className="text-sm font-semibold">{t("owner.leaveServer")}</h4>
				<p className="text-muted-foreground text-sm">
					Testify stops answering there immediately. Getting back in needs a fresh invite from someone still inside, and
					its settings are kept in case it returns.
				</p>
			</div>

			<Field
				htmlFor={inputId}
				label={
					<>
						Type <span className="text-foreground font-mono">{guild.name}</span> to confirm
					</>
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
						Leave
					</Button>
				</div>
			</Field>

			{leave.error !== null && (
				<Warning>{leave.error instanceof ApiError ? leave.error.message : "Testify could not leave."}</Warning>
			)}
		</div>
	);
}
