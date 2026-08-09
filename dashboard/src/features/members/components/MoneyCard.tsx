import { MEMBER_LIMITS, type MemberDetail, MONEY_PURSES, type MoneyPurse, moneyProblem } from "@testify/shared";
import { useState } from "react";
import { Field, Warning } from "@/components/form";
import { FIELD } from "@/components/form/fieldStyles";
import { Button, Card, SegmentedControl } from "@/components/primitives";

const LABELS: Record<MoneyPurse, string> = { wallet: "Wallet", bank: "Bank" };

export function MoneyCard({
	detail,
	busy,
	onChange,
}: {
	detail: MemberDetail;
	busy: boolean;
	onChange: (purse: MoneyPurse, delta: number) => void;
}): React.JSX.Element {
	const [purse, setPurse] = useState<MoneyPurse>("wallet");
	const [amount, setAmount] = useState("");

	const held = purse === "wallet" ? (detail.economy?.wallet ?? 0) : (detail.economy?.bank ?? 0);
	const parsed = Number(amount);
	const valid = amount.trim() !== "" && Number.isInteger(parsed);

	// Both directions are checked against the same amount, so Take can be refused while Add is still offered.
	const addProblem = valid ? moneyProblem(Math.abs(parsed), purse, held) : null;
	const takeProblem = valid ? moneyProblem(-Math.abs(parsed), purse, held) : null;

	return (
		<Card className="flex flex-col gap-4">
			<div>
				<h2 className="font-display text-base font-bold tracking-tight">Money</h2>
				<p className="text-muted-foreground text-sm">
					{detail.economy === null
						? "They have no account here yet — adding money opens one."
						: `They hold ${held.toLocaleString()} in their ${purse}.`}
				</p>
			</div>

			<SegmentedControl
				label="Which purse"
				value={purse}
				segments={MONEY_PURSES.map((one) => ({ value: one, label: LABELS[one] }))}
				onChange={setPurse}
			/>

			<Field label="Amount" htmlFor="money-amount">
				<input
					id="money-amount"
					className={FIELD}
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

			<div className="flex flex-wrap gap-3">
				<Button
					disabled={!valid || addProblem !== null || busy}
					onClick={() => {
						onChange(purse, Math.abs(parsed));
						setAmount("");
					}}
				>
					Add to {LABELS[purse].toLowerCase()}
				</Button>
				<Button
					variant="secondary"
					disabled={!valid || takeProblem !== null || busy}
					onClick={() => {
						onChange(purse, -Math.abs(parsed));
						setAmount("");
					}}
				>
					Take from {LABELS[purse].toLowerCase()}
				</Button>
			</div>
		</Card>
	);
}
