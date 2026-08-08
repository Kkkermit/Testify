import { type LevelBody, MEMBER_LIMITS, type MemberDetail } from "@testify/shared";
import { useState } from "react";
import { Field, Warning } from "@/components/form";
import { FIELD } from "@/components/form/fieldStyles";
import { Button, Card } from "@/components/primitives";

export function LevelCard({
	detail,
	busy,
	onChange,
}: {
	detail: MemberDetail;
	busy: boolean;
	onChange: (body: LevelBody) => void;
}): React.JSX.Element {
	const [level, setLevel] = useState("");
	const [xp, setXp] = useState("");

	const levelValue = Number(level);
	const xpValue = Number(xp);
	const levelValid =
		level.trim() !== "" && Number.isInteger(levelValue) && levelValue >= 0 && levelValue <= MEMBER_LIMITS.maxLevel;
	const xpValid = xp.trim() !== "" && Number.isInteger(xpValue) && xpValue !== 0;

	return (
		<Card className="flex flex-col gap-4">
			<div>
				<h2 className="text-base font-semibold">Level and XP</h2>
				<p className="text-muted-foreground text-sm">
					{detail.levels === null
						? "They have earned no XP here yet."
						: `Level ${String(detail.levels.level)} on ${detail.levels.xp.toLocaleString()} XP.`}
				</p>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<Field label="Set the level to" hint={`0 to ${String(MEMBER_LIMITS.maxLevel)}`} htmlFor="member-level">
					<input
						id="member-level"
						className={FIELD}
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

				<Field label="Or change their XP by" hint="Negative takes XP away." htmlFor="member-xp">
					<input
						id="member-xp"
						className={FIELD}
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
			</div>

			{levelValid && xpValid && <Warning>Set a level or change the XP, not both at once.</Warning>}

			<p className="text-muted-foreground text-xs">
				Any role rewards the new level earns are handed out at the same time.
			</p>

			<div className="flex flex-wrap gap-3">
				<Button
					disabled={!levelValid || xpValid || busy}
					onClick={() => {
						onChange({ level: levelValue });
						setLevel("");
					}}
				>
					Set level
				</Button>
				<Button
					variant="secondary"
					disabled={!xpValid || levelValid || busy}
					onClick={() => {
						onChange({ xp: xpValue });
						setXp("");
					}}
				>
					Change XP
				</Button>
			</div>
		</Card>
	);
}
