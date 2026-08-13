import { type LogLine } from "@testify/shared";
import { ScrollText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/primitives";
import { cn } from "@/lib/cn";
import { clockTime } from "@/lib/datetime";

const TONE: Record<string, string> = {
	error: "text-destructive-text",
	fatal: "text-destructive-text",
	warn: "text-warning",
	info: "text-muted-foreground",
};

/** The bot's own log, as the terminal would show it — monospaced, newest first, one line per record. */
export function LogLines({ lines }: { lines: LogLine[] }): React.JSX.Element {
	const { t } = useTranslation();
	if (lines.length === 0) {
		return (
			<EmptyState
				icon={<ScrollText size={20} />}
				title={t("owner.nothingLogged")}
				body={t("owner.nothingLoggedBody")}
			/>
		);
	}

	return (
		<ol className="divide-border divide-y font-mono text-xs">
			{lines.map((line, index) => (
				<li key={`${line.at}-${String(index)}`} className="flex flex-col gap-1 py-2 sm:flex-row sm:gap-3">
					<span className="text-muted-foreground shrink-0 tabular-nums">{clockTime(line.at)}</span>
					<span className={cn("w-12 shrink-0 uppercase", TONE[line.level] ?? "text-muted-foreground")}>
						{line.level}
					</span>
					<span className="min-w-0 flex-1 break-words">
						{line.message}
						{Object.keys(line.context).length > 0 && (
							<span className="text-muted-foreground block break-all">{summarise(line.context)}</span>
						)}
					</span>
				</li>
			))}
		</ol>
	);
}

/** One line of `key=value`, because a pretty-printed object per record turns the feed into a wall. */
function summarise(context: Record<string, unknown>): string {
	return Object.entries(context)
		.map(([key, value]) => `${key}=${render(value)}`)
		.join("  ");
}

function render(value: unknown): string {
	if (value === null || value === undefined) return String(value);
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return value.toString();

	// An error arrives as `{ name, message, stack }`; its message is the only part worth a line here.
	if (typeof value === "object") {
		const message = (value as { message?: unknown }).message;
		return typeof message === "string" ? message : JSON.stringify(value).slice(0, 200);
	}

	return JSON.stringify(value);
}
