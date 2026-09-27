import { type MemberMove } from "@testify/shared";
import { Link } from "react-router";
import { DividedList } from "@/components/primitives";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { cn } from "@/lib/cn";
import { dateAndTime, since } from "@/lib/datetime";

export function MoveList({
	guildId,
	moves,
	empty,
}: {
	guildId: string;
	moves: MemberMove[];
	empty: string;
}): React.JSX.Element {
	if (moves.length === 0) return <p className="text-muted-foreground text-sm">{empty}</p>;

	return (
		<DividedList>
			{moves.map((move) => (
				<li key={`${move.userId}:${move.at}`} className="flex items-baseline justify-between gap-3 px-4 py-2 text-sm">
					<Link
						to={`/guilds/${guildId}/members/${move.userId}`}
						className={cn(INLINE_TARGET, "hover:text-accent min-w-0 truncate font-medium")}
					>
						{move.name}
					</Link>
					<time dateTime={move.at} title={dateAndTime(move.at)} className="text-muted-foreground shrink-0 text-xs">
						{since(move.at)}
					</time>
				</li>
			))}
		</DividedList>
	);
}
