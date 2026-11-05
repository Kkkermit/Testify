import { fillTemplate, type WelcomeStyle } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { DiscordPreview } from "@/components/primitives";
import { useBotLook } from "@/features/auth/useBot";
import { markSpans, type MarkSpan } from "@/features/welcome/welcome.utils";
import { BUILT_IN_BOT_NAME } from "@/lib/brand";
import { cn } from "@/lib/cn";

/** Filled by the same function the bot posts with, so nobody has to save a template and join with an alt to find out what `{count}` does. */
export function GreetingPreview({
	message,
	style,
	guildName,
	memberCount,
	leaving = false,
}: {
	message: string;
	style: WelcomeStyle;
	guildName: string;
	memberCount: number;
	/** A goodbye is posted once they have gone, so the count is one fewer rather than one more. */
	leaving?: boolean;
}): React.JSX.Element {
	const { t } = useTranslation();
	const bot = useBotLook();
	const name = bot.name ?? BUILT_IN_BOT_NAME;
	const person = leaving ? "someone" : "newcomer";
	const filled = fillTemplate(message, {
		mention: `@${person}`,
		username: person,
		serverName: guildName,
		memberCount: leaving ? Math.max(0, memberCount - 1) : memberCount + 1,
	});

	return (
		<DiscordPreview name={name} avatarUrl={bot.avatarUrl} seed={guildName}>
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
					<div className="bg-accent-wash mt-2 flex h-24 items-center justify-center rounded-field">
						<span className="text-muted-foreground text-xs">{t("welcome.cardAlt")}</span>
					</div>
				)}
			</div>
		</DiscordPreview>
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
