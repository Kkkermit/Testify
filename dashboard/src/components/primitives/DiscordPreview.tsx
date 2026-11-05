import { type ReactNode } from "react";
import { Avatar } from "@/components/primitives/Avatar";

/** A message as Discord draws one from the bot: its picture, its name and the app badge, then the body. */
export function DiscordPreview({
	name,
	avatarUrl,
	seed,
	children,
}: {
	name: string;
	avatarUrl: string | null;
	seed: string;
	children: ReactNode;
}): React.JSX.Element {
	return (
		<div className="bg-background border-border rounded-card border p-4">
			<div className="flex gap-3">
				<Avatar name={name} url={avatarUrl} size={36} seed={seed} />
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
