import { ExternalLink, X } from "lucide-react";
import { Link } from "react-router";
import { Warning } from "@/components/form";
import { Badge, Button, Card, GuildIcon, Skeleton } from "@/components/primitives";
import { useGuildDetail } from "@/features/owner/useControl";

/** One server at a glance, opened from the fleet table rather than by hunting for its id. */
export function GuildDetail({ guildId, onClose }: { guildId: string; onClose: () => void }): React.JSX.Element {
	const detail = useGuildDetail(guildId);

	if (detail.isPending || detail.data === undefined) return <Skeleton className="h-64 w-full" />;

	const guild = detail.data;

	return (
		<Card className="motion-pop flex flex-col gap-4">
			<div className="flex items-start gap-3">
				<GuildIcon name={guild.name} url={guild.iconUrl} size={40} seed={guild.id} />
				<div className="min-w-0 flex-1">
					<h3 className="truncate text-base font-semibold">{guild.name}</h3>
					<p className="text-muted-foreground font-mono text-xs">{guild.id}</p>
				</div>
				<Button variant="ghost" onClick={onClose} aria-label={`Close ${guild.name}`}>
					<X size={15} aria-hidden="true" />
				</Button>
			</div>

			<dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<Figure label="Members" value={guild.memberCount.toLocaleString()} />
				<Figure label="Channels" value={String(guild.channelCount)} />
				<Figure label="Roles" value={String(guild.roleCount)} />
				<Figure label="Commands, 30d" value={guild.usage.toLocaleString()} />
			</dl>

			<dl className="text-muted-foreground flex flex-col gap-1 text-sm">
				<Row
					label="Joined"
					value={guild.joinedAt === null ? "Unknown" : new Date(guild.joinedAt).toLocaleDateString()}
				/>
				<Row label="Created" value={new Date(guild.createdAt).toLocaleDateString()} />
				<Row label="Server owner" value={guild.ownerId} mono />
				<Row label="Testify's nickname" value={guild.nickname ?? "None set"} />
				<Row label="Testify's top role" value={guild.highestRole ?? "None"} />
			</dl>

			<div className="flex flex-wrap items-center gap-2">
				<span className="text-muted-foreground text-sm">Configured:</span>
				{guild.configured.length === 0 ? (
					<Badge tone="warning">Nothing set up</Badge>
				) : (
					guild.configured.map((feature) => <Badge key={feature}>{feature}</Badge>)
				)}
			</div>

			{guild.missingPermissions.length > 0 && (
				<Warning>Missing in this server: {guild.missingPermissions.join(", ")}.</Warning>
			)}

			<Link
				to={`/guilds/${guild.id}`}
				className="text-primary inline-flex items-center gap-1.5 text-sm hover:underline"
			>
				Open its settings
				<ExternalLink size={14} aria-hidden="true" />
			</Link>
		</Card>
	);
}

function Figure({ label, value }: { label: string; value: string }): React.JSX.Element {
	return (
		<div>
			<dt className="text-muted-foreground text-xs">{label}</dt>
			<dd className="font-mono text-lg tabular-nums">{value}</dd>
		</div>
	);
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }): React.JSX.Element {
	return (
		<div className="flex flex-wrap gap-x-3">
			<dt className="w-40 shrink-0">{label}</dt>
			<dd className={mono ? "text-foreground font-mono text-xs" : "text-foreground"}>{value}</dd>
		</div>
	);
}
