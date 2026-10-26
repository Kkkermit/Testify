import { MEMBER_ACTION_LIMITS, type MemberDetail } from "@testify/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Field } from "@/components/form";
import { FIELD } from "@/components/form/fieldStyles";
import { Button, Card, CARD_HEADING } from "@/components/primitives";
import { sanitiseInput } from "@/lib/sanitise";

/** Keyed by the saved nickname on the page, so a rename that lands puts the box back in step with it. */
export function NicknameCard({
	detail,
	busy,
	onSave,
}: {
	detail: MemberDetail;
	busy: boolean;
	onSave: (nickname: string | null) => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const [draft, setDraft] = useState(detail.nickname ?? "");
	const typed = sanitiseInput(draft).trim();
	const changed = typed !== (detail.nickname ?? "");

	return (
		<Card className="flex flex-col gap-4">
			<div>
				<h2 className={CARD_HEADING}>{t("members.nicknameTitle")}</h2>
				<p className="text-muted-foreground text-sm">{t("members.nicknameBody")}</p>
			</div>

			<form
				className="flex flex-col gap-3"
				onSubmit={(event) => {
					event.preventDefault();
					if (changed) onSave(typed === "" ? null : typed);
				}}
			>
				<Field label={t("members.nickname")} hint={t("members.nicknameHint")} htmlFor="member-nickname">
					<input
						id="member-nickname"
						className={FIELD}
						value={draft}
						maxLength={MEMBER_ACTION_LIMITS.maxNickname}
						placeholder={detail.username}
						autoComplete="off"
						onChange={(event) => {
							setDraft(event.target.value);
						}}
					/>
				</Field>
				<div className="flex flex-wrap gap-3">
					<Button type="submit" variant="secondary" disabled={busy || !changed}>
						{typed === "" && detail.nickname !== null ? t("members.clearNickname") : t("members.saveNickname")}
					</Button>
				</div>
			</form>
		</Card>
	);
}
