import { type ServerChange } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/primitives";
import { KIND_LABELS, VERB_LABELS, verbTone } from "@/features/changes/changes.utils";
import { dateAndTime, since } from "@/lib/datetime";

export function ChangeRow({ change }: { change: ServerChange }): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<li className="flex flex-col gap-1 px-6 py-3">
			<div className="flex flex-wrap items-center gap-2 text-sm">
				<Badge>{t(KIND_LABELS[change.kind])}</Badge>
				{change.summary === null ? (
					<>
						{change.target !== null && <span className="font-medium break-all">{change.target}</span>}
						<Badge tone={verbTone(change.verb)}>{t(VERB_LABELS[change.verb])}</Badge>
					</>
				) : (
					<span className="min-w-0 flex-1">{change.summary}</span>
				)}
			</div>
			<p className="text-muted-foreground text-xs">
				{t("changes.byline", {
					who: change.actorTag,
					where: change.source === "dashboard" ? t("changes.onDashboard") : t("changes.inDiscord"),
				})}
				{" · "}
				<time dateTime={change.at} title={dateAndTime(change.at)} className="tabular-nums">
					{since(change.at)}
				</time>
			</p>
			{change.reason !== null && change.reason !== "" && (
				<p className="text-muted-foreground text-xs">{t("changes.reason", { reason: change.reason })}</p>
			)}
		</li>
	);
}
