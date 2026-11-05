import { MEMBER_LIMITS, type MemberDetail, MONEY_PURSES, type MoneyPurse, moneyProblem } from "@testify/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Field, FieldGroup, RowActions, SettingRows, Warning } from "@/components/form";
import { FIELD } from "@/components/form/fieldStyles";
import { Button, SegmentedControl } from "@/components/primitives";
import { type TranslationKey } from "@/i18n";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/intl";
import { problemText } from "@/lib/problemText";

const LABELS: Record<MoneyPurse, TranslationKey> = { wallet: "members.wallet", bank: "members.bank" };

export function MoneyCard({
	detail,
	busy,
	onChange,
}: {
	detail: MemberDetail;
	busy: boolean;
	onChange: (purse: MoneyPurse, delta: number) => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const [purse, setPurse] = useState<MoneyPurse>("wallet");
	const [amount, setAmount] = useState("");

	const held = purse === "wallet" ? (detail.economy?.wallet ?? 0) : (detail.economy?.bank ?? 0);
	const parsed = Number(amount);
	const valid = amount.trim() !== "" && Number.isInteger(parsed);

	const addProblem = valid ? problemText(moneyProblem(Math.abs(parsed), purse, held), t) : null;
	const takeProblem = valid ? problemText(moneyProblem(-Math.abs(parsed), purse, held), t) : null;

	return (
		<SettingRows
			title={t("members.money")}
			description={
				detail.economy === null
					? t("members.noAccountYet")
					: t("members.holds", { amount: formatNumber(held), purse: t(LABELS[purse]).toLowerCase() })
			}
		>
			<FieldGroup label={t("members.whichPurse")} named={false}>
				<SegmentedControl
					label={t("members.whichPurse")}
					value={purse}
					segments={MONEY_PURSES.map((one) => ({ value: one, label: t(LABELS[one]) }))}
					onChange={setPurse}
				/>
			</FieldGroup>

			<Field label={t("members.amount")} htmlFor="money-amount">
				<input
					id="money-amount"
					className={cn(FIELD, "max-w-48 tabular-nums")}
					type="number"
					inputMode="numeric"
					min={1}
					max={MEMBER_LIMITS.maxMoneyChange}
					value={amount}
					onChange={(event) => {
						setAmount(event.target.value);
					}}
				/>
			</Field>

			{valid && takeProblem !== null && <Warning>{takeProblem}</Warning>}

			<RowActions>
				<Button
					variant="secondary"
					disabled={!valid || addProblem !== null || busy}
					onClick={() => {
						onChange(purse, Math.abs(parsed));
						setAmount("");
					}}
				>
					{t("members.addTo", { purse: t(LABELS[purse]).toLowerCase() })}
				</Button>
				<Button
					variant="secondary"
					disabled={!valid || takeProblem !== null || busy}
					onClick={() => {
						onChange(purse, -Math.abs(parsed));
						setAmount("");
					}}
				>
					{t("members.takeFrom", { purse: t(LABELS[purse]).toLowerCase() })}
				</Button>
			</RowActions>
		</SettingRows>
	);
}
