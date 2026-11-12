import { type LogLine } from "@testify/shared";
import { ChevronRight, ScrollText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/primitives";
import { contextSummary, type ErrorBlock, errorsIn, prettyJson } from "@/features/owner/logs.utils";
import { cn } from "@/lib/cn";
import { clockTime, dateAndTime } from "@/lib/datetime";

const TONE: Record<string, string> = {
	error: "text-destructive-text",
	fatal: "text-destructive-text",
	warn: "text-warning",
	info: "text-muted-foreground",
};

const PRE = "bg-muted rounded-field px-3 py-2 break-words whitespace-pre-wrap";
const LABEL = "text-muted-foreground font-sans text-xs font-medium";

/** `past` writes each line's date too, since a run that has ended may have spanned several days. */
export function LogLines({ lines, past }: { lines: LogLine[]; past: boolean }): React.JSX.Element {
	const { t } = useTranslation();
	if (lines.length === 0) {
		return (
			<EmptyState
				icon={<ScrollText size={20} />}
				title={t("owner.nothingLogged")}
				body={past ? t("owner.nothingLoggedPast") : t("owner.nothingLoggedBody")}
			/>
		);
	}

	return (
		<ol className="divide-border divide-y font-mono text-xs">
			{lines.map((line, index) => (
				<li key={`${line.at}-${String(index)}`}>
					{Object.keys(line.context).length === 0 ? (
						<Row line={line} past={past} />
					) : (
						<details className="group">
							<summary className="hover:bg-muted/60 rounded-field cursor-pointer list-none marker:content-none">
								<Row line={line} past={past} expandable />
							</summary>
							<Detail context={line.context} />
						</details>
					)}
				</li>
			))}
		</ol>
	);
}

function Row({ line, past, expandable = false }: { line: LogLine; past: boolean; expandable?: boolean }) {
	return (
		<span className="flex flex-col gap-1 py-2 sm:flex-row sm:items-start sm:gap-3">
			{/* The time and the level share a line on a phone, so the message gets the whole width under them. */}
			<span className="flex shrink-0 items-center gap-3">
				<span className="text-muted-foreground flex items-center gap-1 tabular-nums">
					<ChevronRight
						size={12}
						aria-hidden="true"
						className={cn("transition-transform duration-150 group-open:rotate-90", !expandable && "invisible")}
					/>
					{past ? dateAndTime(line.at) : clockTime(line.at)}
				</span>
				<span className={cn("w-12 uppercase", TONE[line.level] ?? "text-muted-foreground")}>{line.level}</span>
			</span>
			<span className="min-w-0 flex-1 break-words max-sm:pl-4">
				{line.message}
				{Object.keys(line.context).length > 0 && (
					<span className="text-muted-foreground line-clamp-2 block break-all">{contextSummary(line.context)}</span>
				)}
			</span>
		</span>
	);
}

function Detail({ context }: { context: Record<string, unknown> }): React.JSX.Element {
	const { t } = useTranslation();
	const { errors, rest } = errorsIn(context);

	return (
		<div className="flex flex-col gap-3 pb-3 sm:pl-5">
			{errors.map((error) => (
				<ErrorDetail key={error.key} error={error} />
			))}
			{Object.keys(rest).length > 0 && (
				<section className="flex flex-col gap-1">
					<p className={LABEL}>{t("owner.logContext")}</p>
					<pre className={PRE}>{prettyJson(rest)}</pre>
				</section>
			)}
		</div>
	);
}

function ErrorDetail({ error, causedBy = false }: { error: ErrorBlock; causedBy?: boolean }): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<section className="flex flex-col gap-1">
			<p className={LABEL}>{causedBy ? t("owner.logCause") : t("owner.logError", { key: error.key })}</p>
			<pre className={PRE}>{error.stack}</pre>
			{Object.keys(error.fields).length > 0 && <pre className={PRE}>{prettyJson(error.fields)}</pre>}
			{error.cause !== null && <ErrorDetail error={error.cause} causedBy />}
		</section>
	);
}
