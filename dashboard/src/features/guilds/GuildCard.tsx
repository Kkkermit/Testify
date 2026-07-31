import { type ManageableGuild } from "@testify/shared";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { Badge, Card, GuildIcon } from "@/components/primitives";

export function GuildCard({ guild }: { guild: ManageableGuild }): React.JSX.Element {
	const body = (
		<>
			<GuildIcon name={guild.name} url={guild.iconUrl} />
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

	// A guild without the bot is shown rather than hidden — the invite is the point, and it costs nothing.
	if (!guild.botPresent) {
		return (
			<Card className="flex items-center gap-3 p-4 opacity-70">
				{body}
				<Badge>Not added</Badge>
			</Card>
		);
	}

	return (
		<Link
			to={`/guilds/${guild.id}`}
			className="bg-card border-border hover:border-input surface-edge group flex items-center gap-3 rounded-[0.625rem] border p-4 transition-colors duration-150"
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
