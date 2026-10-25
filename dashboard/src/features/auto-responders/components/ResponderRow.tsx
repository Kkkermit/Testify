import { type AutoResponder, autoResponderBlocked, type AutoResponderInput } from "@testify/shared";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Warning } from "@/components/form";
import { Button, cardClass } from "@/components/primitives";
import { MATCH_LABELS } from "@/features/auto-responders/autoResponders.utils";
import { ResponderFields } from "@/features/auto-responders/components/ResponderFields";
import { problemText } from "@/lib/problemText";
import { markupWarning } from "@/lib/sanitise";

/** One responder, edited in place and saved explicitly, because a reply is a message somebody will read. */
export function ResponderRow({
	responder,
	others,
	saving,
	failure,
	onSave,
	onRemove,
}: {
	responder: AutoResponder;
	others: readonly AutoResponder[];
	saving: boolean;
	/** Why the last save of this row was refused, shown beside it rather than at the foot of the page. */
	failure: string | null;
	onSave: (next: AutoResponderInput) => void;
	onRemove: () => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const [draft, setDraft] = useState<AutoResponderInput>(responder);

	useEffect(() => {
		setDraft({ trigger: responder.trigger, match: responder.match, reply: responder.reply });
	}, [responder.trigger, responder.match, responder.reply]);

	const dirty =
		draft.trigger !== responder.trigger || draft.match !== responder.match || draft.reply !== responder.reply;
	const blocked = problemText(autoResponderBlocked(draft, others), t) ?? markupWarning(draft.reply);

	return (
		<li className={cardClass("compact", "flex flex-col gap-3")}>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h3 className="text-sm font-medium break-all">{responder.trigger}</h3>
				<span className="text-muted-foreground text-xs">{t(MATCH_LABELS[responder.match])}</span>
			</div>

			<ResponderFields id={`responder-${responder.id}`} value={draft} onChange={setDraft} />

			<div className="flex flex-wrap items-center gap-3">
				{dirty && (
					<Button
						disabled={saving || blocked !== null}
						onClick={() => {
							onSave(draft);
						}}
					>
						{t("common.save")}
					</Button>
				)}
				<Button
					variant="ghost"
					aria-label={t("autoResponders.removeFor", { trigger: responder.trigger })}
					onClick={onRemove}
					disabled={saving}
				>
					<Trash2 size={16} aria-hidden="true" />
				</Button>
			</div>

			{dirty && blocked !== null && <Warning>{blocked}</Warning>}
			{failure !== null && <Warning>{failure}</Warning>}
		</li>
	);
}
