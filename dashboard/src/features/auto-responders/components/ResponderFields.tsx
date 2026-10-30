import { AUTO_RESPONDER_LIMITS, type AutoResponderInput } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { Field, FIELD, SELECT } from "@/components/form";
import { MATCH_LABELS, MATCH_ORDER } from "@/features/auto-responders/autoResponders.utils";
import { cn } from "@/lib/cn";

/** The three fields of a responder, the same whether it is being added or edited. */
export function ResponderFields({
	id,
	value,
	onChange,
}: {
	id: string;
	value: AutoResponderInput;
	onChange: (next: AutoResponderInput) => void;
}): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<>
			<div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_16rem]">
				<Field label={t("autoResponders.trigger")} htmlFor={`${id}-trigger`} hint={t("autoResponders.triggerHint")}>
					<input
						id={`${id}-trigger`}
						type="text"
						value={value.trigger}
						maxLength={AUTO_RESPONDER_LIMITS.maxTrigger}
						onChange={(event) => {
							onChange({ ...value, trigger: event.target.value });
						}}
						className={FIELD}
					/>
				</Field>

				<Field label={t("autoResponders.match")} htmlFor={`${id}-match`}>
					<select
						id={`${id}-match`}
						value={value.match}
						onChange={(event) => {
							onChange({ ...value, match: event.target.value as AutoResponderInput["match"] });
						}}
						className={SELECT}
					>
						{MATCH_ORDER.map((match) => (
							<option key={match} value={match}>
								{t(MATCH_LABELS[match])}
							</option>
						))}
					</select>
				</Field>
			</div>

			<Field label={t("autoResponders.reply")} htmlFor={`${id}-reply`}>
				<textarea
					id={`${id}-reply`}
					rows={2}
					value={value.reply}
					maxLength={AUTO_RESPONDER_LIMITS.maxReply}
					onChange={(event) => {
						onChange({ ...value, reply: event.target.value });
					}}
					className={cn(FIELD, "resize-y")}
				/>
				<span className="text-muted-foreground text-xs tabular-nums" aria-live="polite">
					{t("common.partOf", { part: value.reply.length, whole: AUTO_RESPONDER_LIMITS.maxReply })}
				</span>
			</Field>
		</>
	);
}
