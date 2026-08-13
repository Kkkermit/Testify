import { LEVEL_LIMITS, type LevelRewardInput } from "@testify/shared";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Field, FIELD, savingStateOf, SELECT, Warning } from "@/components/form";
import { Button } from "@/components/primitives";
import { Refusal } from "@/features/levelling/components/Refusal";
import { TabPanel } from "@/features/levelling/components/TabPanel";
import { type TabProps } from "@/features/levelling/levelling.types";
import { roleNameOf } from "@/features/levelling/levelling.utils";
import { useUpdateRewards } from "@/features/levelling/useLevelling";

export function RewardsTab({
	guildId,
	roles,
	rewards,
}: Pick<TabProps, "guildId" | "roles"> & { rewards: LevelRewardInput[] }): React.JSX.Element {
	const { t } = useTranslation();
	const update = useUpdateRewards(guildId);
	const [level, setLevel] = useState(5);
	const [roleId, setRoleId] = useState("");

	const assignable = roles.filter((role) => role.assignableByBot);
	const full = rewards.length >= LEVEL_LIMITS.maxRewards;
	const taken = rewards.some((reward) => reward.level === level);

	return (
		<TabPanel
			description={`A role handed out when someone reaches a level. ${String(rewards.length)} of ${String(LEVEL_LIMITS.maxRewards)} used.`}
			saving={savingStateOf(update.isPending, update.isSuccess)}
		>
			{rewards.length === 0 ? (
				<p className="text-muted-foreground text-sm">{t("levelling.noRewards")}</p>
			) : (
				<ul className="divide-border border-border divide-y rounded-lg border">
					{rewards.map((reward) => (
						<li
							key={`${String(reward.level)}-${reward.roleId}`}
							className="hover:bg-muted/40 flex items-center gap-3 px-3 py-2 text-sm transition-colors duration-150"
						>
							<span className="bg-muted rounded px-2 py-0.5 font-mono text-xs tabular-nums">Level {reward.level}</span>
							<span className="min-w-0 flex-1 truncate">{roleNameOf(roles, reward.roleId)}</span>
							<Button
								variant="ghost"
								aria-label={`Remove the reward for level ${String(reward.level)}`}
								onClick={() => {
									update.mutate(rewards.filter((candidate) => candidate.level !== reward.level));
								}}
							>
								<Trash2 size={16} aria-hidden="true" />
							</Button>
						</li>
					))}
				</ul>
			)}

			<div className="flex flex-wrap items-end gap-3">
				<Field label={t("levelling.level")} className="w-24">
					<input
						type="number"
						inputMode="numeric"
						min={1}
						max={LEVEL_LIMITS.maxRewardLevel}
						value={level}
						onChange={(event) => {
							setLevel(Number(event.target.value));
						}}
						className={FIELD}
					/>
				</Field>
				<Field label={t("levelling.role")} className="min-w-48 flex-1">
					<select
						value={roleId}
						onChange={(event) => {
							setRoleId(event.target.value);
						}}
						className={SELECT}
					>
						<option value="">{t("levelling.chooseRole")}</option>
						{assignable.map((role) => (
							<option key={role.id} value={role.id}>
								{role.name}
							</option>
						))}
					</select>
				</Field>
				<Button
					disabled={roleId === "" || full || taken}
					onClick={() => {
						update.mutate([...rewards, { level, roleId }]);
						setRoleId("");
					}}
				>
					<Plus size={16} aria-hidden="true" /> Add
				</Button>
			</div>

			{full && <Warning>{t("levelling.rewardsFull")}</Warning>}
			{taken && <Warning>Level {level} already has a reward. Remove it first, or pick another level.</Warning>}
			{assignable.length < roles.length && <Warning>{t("levelling.hierarchyNote")}</Warning>}
			<Refusal error={update.error} />
		</TabPanel>
	);
}
