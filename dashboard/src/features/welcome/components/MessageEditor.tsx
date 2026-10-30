import { WELCOME_LIMITS, WELCOME_PLACEHOLDERS, type WelcomePlaceholder } from "@testify/shared";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Field, FIELD, Warning } from "@/components/form";
import { Button } from "@/components/primitives";
import { PlaceholderHelp } from "@/features/welcome/components/PlaceholderHelp";
import { insertToken } from "@/features/welcome/welcome.utils";
import { cn } from "@/lib/cn";
import { markupWarning, sanitiseInput } from "@/lib/sanitise";

/** A template held as a draft and saved on blur; the draft is the caller's, so a preview can follow it. */
export function MessageEditor({
	id,
	label,
	saveLabel,
	draft,
	saved,
	disabled,
	onDraft,
	onSave,
	max = WELCOME_LIMITS.maxMessage,
	tokens = WELCOME_PLACEHOLDERS,
}: {
	id: string;
	label: string;
	saveLabel: string;
	draft: string;
	saved: string;
	disabled: boolean;
	onDraft: (draft: string) => void;
	onSave: (message: string) => void;
	max?: number;
	tokens?: readonly WelcomePlaceholder[];
}): React.JSX.Element {
	const { t } = useTranslation();
	const textarea = useRef<HTMLTextAreaElement>(null);
	const dirty = draft !== saved;
	const tooLong = draft.length > max;
	const warning = markupWarning(draft);

	function save(): void {
		if (!dirty || tooLong || draft.trim() === "") return;
		onSave(sanitiseInput(draft));
	}

	return (
		<>
			{/* The counter is a status, not part of the field's name, so it sits after the control. */}
			<Field label={label} htmlFor={id}>
				<textarea
					id={id}
					ref={textarea}
					rows={3}
					value={draft}
					disabled={disabled}
					onChange={(event) => {
						onDraft(event.target.value);
					}}
					onBlur={save}
					className={cn(FIELD, "resize-y font-mono", tooLong && "border-destructive")}
				/>
				<span className="text-muted-foreground text-xs tabular-nums" aria-live="polite">
					{t("common.partOf", { part: draft.length, whole: max })}
				</span>
			</Field>

			<PlaceholderHelp
				disabled={disabled}
				tokens={tokens}
				onInsert={(token) => {
					onDraft(insertToken(draft, token, textarea.current?.selectionStart ?? null));
					textarea.current?.focus();
				}}
			/>

			{warning !== null && <Warning>{warning}</Warning>}
			{tooLong && <Warning>{t("welcome.tooLong")}</Warning>}
			{dirty && !tooLong && (
				<div className="flex items-center gap-3">
					<Button onClick={save} disabled={draft.trim() === ""}>
						{saveLabel}
					</Button>
					<Button
						variant="ghost"
						onClick={() => {
							onDraft(saved);
						}}
					>
						{t("common.discard")}
					</Button>
				</div>
			)}
		</>
	);
}
