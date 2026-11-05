import { type ReactNode } from "react";
import { BotMark } from "@/components/brand/BotMark";

export function DiscordPreview({
	name,
	avatarUrl,
	children,
}: {
	name: string;
	avatarUrl: string | null;
	children: ReactNode;
}): React.JSX.Element {
	return (
		<div className="bg-background border-border rounded-card border p-4">
			<div className="flex gap-3">
				<BotMark src={avatarUrl} name={name} size={36} />
				<div className="min-w-0 flex-1">
					<p className="text-sm font-medium">
						{name} <span className="bg-primary/20 text-accent ml-1 rounded-chip px-1 py-0.5 text-[0.625rem]">BOT</span>
					</p>
					{children}
				</div>
			</div>
		</div>
	);
}
