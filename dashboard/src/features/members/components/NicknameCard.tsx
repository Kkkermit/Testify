import { MEMBER_ACTION_LIMITS, type MemberDetail } from "@testify/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Field, RowActions, SettingRows } from "@/components/form";
import { FIELD } from "@/components/form/fieldStyles";
import { Button } from "@/components/primitives";
import { sanitiseInput } from "@/lib/sanitise";

/** Keyed by the saved nickname, so a rename that lands resets the box. */
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
		<SettingRows
			title={t("members.nicknameTitle")}
			description={t("members.nicknameBody")}
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
			<RowActions>
				<Button type="submit" variant="secondary" disabled={busy || !changed}>
					{typed === "" && detail.nickname !== null ? t("members.clearNickname") : t("members.saveNickname")}
				</Button>
			</RowActions>
		</SettingRows>
	);
}
