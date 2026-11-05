import { type ReactNode } from "react";
import { DiscordPreview } from "@/components/primitives";
import { useBotLook } from "@/features/auth/useBot";
import { markSpans, type MarkSpan } from "@/features/welcome/welcome.utils";
import { BUILT_IN_BOT_NAME } from "@/lib/brand";
import { cn } from "@/lib/cn";

export function PostPreview({
	text,
	style = "text",
	empty,
	children,
}: {
	text: string;
	style?: string;
	empty?: string;
	children?: ReactNode;
}): React.JSX.Element {
	const bot = useBotLook();
	const blank = text.trim() === "";

	return (
		<DiscordPreview name={bot.name ?? BUILT_IN_BOT_NAME} avatarUrl={bot.avatarUrl}>
			<div
				className={cn(
					"mt-1 text-sm break-words",
					style === "embed" && "border-primary bg-card rounded-r-field border-l-4 p-3",
				)}
			>
				{blank && empty !== undefined ? (
					<p className="text-muted-foreground">{empty}</p>
				) : (
					<p className="whitespace-pre-wrap">
						{markSpans(text).map((span, index) => (
							<Marked key={index} span={span} />
						))}
					</p>
				)}
				{children}
			</div>
		</DiscordPreview>
	);
}

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
