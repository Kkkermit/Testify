import { type ServerChange } from "@testify/shared";
import { RotateCcw } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { Badge, Button } from "@/components/primitives";
import { KIND_LABELS, VERB_LABELS, verbTone, WHERE_LABELS } from "@/features/changes/changes.utils";
import { RestorePanel } from "@/features/changes/components/RestorePanel";
import { dateAndTime, since } from "@/lib/datetime";
import { personName } from "@/lib/people";

export function ChangeRow({ change }: { change: ServerChange }): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();
	const [open, setOpen] = useState(false);
	const [done, setDone] = useState(false);
	const panelId = useId();
	const summaryId = useId();

	return (
		<li className="flex flex-col gap-2 px-6 py-3">
			<div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
				<div className="flex min-w-0 grow basis-64 flex-col gap-1">
					<div className="flex flex-wrap items-center gap-2 text-sm">
						<Badge>{t(KIND_LABELS[change.kind])}</Badge>
						{change.summary === null ? (
							<>
								{change.target !== null && <span className="font-medium break-all">{change.target}</span>}
								<Badge tone={verbTone(change.verb)}>{t(VERB_LABELS[change.verb])}</Badge>
							</>
						) : (
							<span id={summaryId} className="min-w-0 flex-1">
								{change.summary}
							</span>
						)}
					</div>
					<p className="text-muted-foreground text-xs">
						{t("changes.byline", {
							who: personName(change.actorTag, t),
							where: t(WHERE_LABELS[change.source]),
						})}
						{" · "}
						<time dateTime={change.at} title={dateAndTime(change.at)} className="tabular-nums">
							{since(change.at)}
						</time>
					</p>
					{change.reason !== null && change.reason !== "" && (
						<p className="text-muted-foreground text-xs">{t("changes.reason", { reason: change.reason })}</p>
					)}
				</div>
				{change.restore !== null && !done && (
					<Button
						variant="secondary"
						aria-expanded={open}
						aria-controls={panelId}
						aria-describedby={change.summary === null ? undefined : summaryId}
						onClick={() => {
							setOpen((was) => !was);
						}}
					>
						<RotateCcw size={15} aria-hidden="true" />
						{t("restore.putBack")}
					</Button>
				)}
			</div>
			{done && (
				<p role="status" className="text-success text-sm">
					{t("restore.done")}
				</p>
			)}
			{open && change.restore !== null && !done && (
				<RestorePanel
					id={panelId}
					guildId={guildId}
					restore={change.restore}
					onClose={() => {
						setOpen(false);
					}}
					onDone={() => {
						setDone(true);
						setOpen(false);
					}}
				/>
			)}
		</li>
	);
}
