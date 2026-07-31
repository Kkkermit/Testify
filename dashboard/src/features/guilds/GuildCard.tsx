import { type ManageableGuild } from "@testify/shared";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { Badge, Card, cardClass, GuildIcon, Tooltip } from "@/components/primitives";

export function GuildCard({ guild }: { guild: ManageableGuild }): React.JSX.Element {
	const body = (
		<>
			<GuildIcon name={guild.name} url={guild.iconUrl} seed={guild.id} />
			<span className="min-w-0 flex-1">
				<span className="block truncate font-medium">{guild.name}</span>
				<span className="text-muted-foreground block text-xs tabular-nums">
					{guild.memberCount === null
						? "Testify is not in this server"
						: `${guild.memberCount.toLocaleString()} members`}
				</span>
			</span>
		</>
	);

	// A server without the bot is shown rather than hidden — the invite is the point, and it costs nothing.
	if (!guild.botPresent) {
		return (
			<Card padding="compact" className="flex items-center gap-3 opacity-70">
				{body}
				<Tooltip label="Invite Testify to this server and it will appear here as configurable.">
					<span tabIndex={0} className="rounded-full">
						<Badge>Not added</Badge>
					</span>
				</Tooltip>
			</Card>
		);
	}

	return (
		<Link
			to={`/guilds/${guild.id}`}
			className={cardClass(
				"compact",
				"hover:border-input group flex items-center gap-3 transition-colors duration-150",
			)}
		>
			{body}
			<ChevronRight
				size={16}
				aria-hidden="true"
				className="text-muted-foreground shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-0.5"
			/>
		</Link>
	);
}
