import { fillTemplate, type WelcomeStyle } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { Avatar } from "@/components/primitives";
import { useBot } from "@/features/auth/useBot";
import { markSpans, type MarkSpan } from "@/features/welcome/welcome.utils";
import { BUILT_IN_BOT_NAME } from "@/lib/brand";
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
	const { t } = useTranslation();
	const bot = useBot();
	const name = bot.data?.name ?? BUILT_IN_BOT_NAME;
	const filled = fillTemplate(message, {
		mention: "@newcomer",
		username: "newcomer",
		serverName: guildName,
		memberCount: memberCount + 1,
	});

	return (
		<div className="bg-background border-border rounded-card border p-4">
			<div className="flex gap-3">
				<Avatar name={name} url={bot.data?.avatarUrl ?? null} size={36} seed={guildName} />
				<div className="min-w-0 flex-1">
					<p className="text-sm font-medium">
						{name} <span className="bg-primary/20 text-accent ml-1 rounded-chip px-1 py-0.5 text-[0.625rem]">BOT</span>
					</p>

					<div
						className={cn(
							"mt-1 text-sm break-words",
							style === "embed" && "border-primary bg-card rounded-r-field border-l-4 p-3",
						)}
					>
						<p className="whitespace-pre-wrap">
							{markSpans(filled).map((span, index) => (
								<Marked key={index} span={span} />
							))}
						</p>
						{style === "card" && (
							<div className="from-primary/30 to-card mt-2 flex h-24 items-center justify-center rounded-field bg-gradient-to-br">
								<span className="text-muted-foreground text-xs">{t("welcome.cardAlt")}</span>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

/** Discord's own marks, so the preview answers "what will this look like" rather than "what did I type". */
function Marked({ span }: { span: MarkSpan }): React.JSX.Element {
	if (span.marks.includes("code"))
		return <code className="bg-muted rounded-chip px-1 py-0.5 font-mono">{span.text}</code>;

	return (
		<span
			className={cn(
				span.marks.includes("bold") && "font-bold",
				span.marks.includes("italic") && "italic",
				span.marks.includes("underline") && "underline",
				span.marks.includes("strike") && "line-through",
			)}
		>
			{span.text}
		</span>
	);
}
