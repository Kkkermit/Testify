import { fillTemplate, type WelcomeStyle } from "@testify/shared";
import { Avatar } from "@/components/primitives";
import { cn } from "@/lib/cn";

/** Filled by the same function the bot posts with, so nobody has to save a template and join with an alt to find out what `{count}` does. */
export function GreetingPreview({
	message,
	style,
	guildName,
	memberCount,
}: {
	message: string;
	style: WelcomeStyle;
	guildName: string;
	memberCount: number;
}): React.JSX.Element {
	const filled = fillTemplate(message, {
		mention: "@newcomer",
		username: "newcomer",
		serverName: guildName,
		memberCount: memberCount + 1,
	});

	return (
		<div className="bg-background border-border rounded-card border p-4">
			<div className="flex gap-3">
				<Avatar name="Testify" url={null} size={36} seed={guildName} />
				<div className="min-w-0 flex-1">
					<p className="text-sm font-medium">
						Testify <span className="bg-primary/20 text-accent ml-1 rounded px-1 py-0.5 text-[0.625rem]">BOT</span>
					</p>

					<div
						className={cn(
							"mt-1 text-sm break-words",
							style === "embed" && "border-primary bg-card rounded-r border-l-4 p-3",
						)}
					>
						{/* Deliberately not rendered as markdown: the point is what was typed, not a second renderer to keep in step. */}
						<p className="whitespace-pre-wrap">{filled}</p>
						{style === "card" && (
							<div className="from-primary/30 to-card mt-2 flex h-24 items-center justify-center rounded-lg bg-gradient-to-br">
								<span className="text-muted-foreground text-xs">Welcome card image</span>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
