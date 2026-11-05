import { type LevelBody, MEMBER_LIMITS, type MemberDetail } from "@testify/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Field, RowActions, SettingRows, Warning } from "@/components/form";
import { FIELD } from "@/components/form/fieldStyles";
import { Button } from "@/components/primitives";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/intl";

export function LevelCard({
	detail,
	busy,
	onChange,
}: {
	detail: MemberDetail;
	busy: boolean;
	onChange: (body: LevelBody) => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const [level, setLevel] = useState("");
	const [xp, setXp] = useState("");

	const levelValue = Number(level);
	const xpValue = Number(xp);
	const levelValid =
		level.trim() !== "" && Number.isInteger(levelValue) && levelValue >= 0 && levelValue <= MEMBER_LIMITS.maxLevel;
	const xpValid = xp.trim() !== "" && Number.isInteger(xpValue) && xpValue !== 0;

	return (
		<SettingRows
			title={t("members.levelAndXp")}
			description={
				detail.levels === null
					? t("members.noXpYet")
					: t("members.levelOnXp", { level: detail.levels.level, xp: formatNumber(detail.levels.xp) })
			}
		>
			<Field
				label={t("members.setLevel")}
				hint={t("members.levelRange", { max: MEMBER_LIMITS.maxLevel })}
				htmlFor="member-level"
			>
				<input
					id="member-level"
					className={cn(FIELD, "max-w-48 tabular-nums")}
					type="number"
					inputMode="numeric"
					min={0}
					max={MEMBER_LIMITS.maxLevel}
					value={level}
					onChange={(event) => {
						setLevel(event.target.value);
					}}
				/>
			</Field>

			<Field label={t("members.changeXp")} hint={t("members.changeXpHint")} htmlFor="member-xp">
				<input
					id="member-xp"
					className={cn(FIELD, "max-w-48 tabular-nums")}
					type="number"
					inputMode="numeric"
					min={-MEMBER_LIMITS.maxXpGrant}
					max={MEMBER_LIMITS.maxXpGrant}
					value={xp}
					onChange={(event) => {
						setXp(event.target.value);
					}}
				/>
			</Field>

			{levelValid && xpValid && <Warning>{t("members.levelOrXp")}</Warning>}

			<RowActions>
				<Button
					variant="secondary"
					disabled={!levelValid || xpValid || busy}
					onClick={() => {
						onChange({ level: levelValue });
						setLevel("");
					}}
				>
					{t("members.setLevelAction")}
				</Button>
				<Button
					variant="secondary"
					disabled={!xpValid || levelValid || busy}
					onClick={() => {
						onChange({ xp: xpValue });
						setXp("");
					}}
				>
					{t("members.changeXpAction")}
				</Button>
				<span className="text-muted-foreground text-xs">{t("members.levelRewardNote")}</span>
			</RowActions>
		</SettingRows>
	);
}
