import { LEVEL_LIMITS, type XpBoostInput } from "@testify/shared";
import { SELECT, RoleChecklist, savingStateOf } from "@/components/form";
import { Refusal } from "@/features/levelling/components/Refusal";
import { TabPanel } from "@/features/levelling/components/TabPanel";
import { type TabProps } from "@/features/levelling/levelling.types";
import { multiplierChoices, roleNameOf } from "@/features/levelling/levelling.utils";
import { useUpdateBoosts } from "@/features/levelling/useLevelling";
import { cn } from "@/lib/cn";

const DEFAULT_MULTIPLIER = 2;

export function BoostsTab({
	guildId,
	roles,
	boosts,
}: Pick<TabProps, "guildId" | "roles"> & { boosts: XpBoostInput[] }): React.JSX.Element {
	const update = useUpdateBoosts(guildId);

	return (
		<TabPanel
			description="Members holding one of these earn more XP. Someone with several gets the highest, not the product."
			saving={savingStateOf(update.isPending, update.isSuccess)}
		>
			<RoleChecklist
				label="Boost roles"
				roles={roles}
				value={boosts.map((boost) => boost.roleId)}
				max={LEVEL_LIMITS.maxBoosts}
				onChange={(roleIds) => {
					// The list is replaced whole, so a role keeps its multiplier across an unrelated add or remove.
					update.mutate(
						roleIds.map((roleId) => ({
							roleId,
							multiplier: boosts.find((boost) => boost.roleId === roleId)?.multiplier ?? DEFAULT_MULTIPLIER,
						})),
					);
				}}
			/>

			{boosts.length > 0 && (
				<ul className="divide-border border-border divide-y rounded-lg border">
					{boosts.map((boost) => (
						<li key={boost.roleId} className="flex items-center gap-3 px-3 py-2 text-sm">
							<span className="min-w-0 flex-1 truncate">{roleNameOf(roles, boost.roleId)}</span>
							<label className="flex items-center gap-2">
								<span className="text-muted-foreground text-xs">Multiplier</span>
								<select
									aria-label={`Multiplier for ${roleNameOf(roles, boost.roleId)}`}
									value={boost.multiplier}
									onChange={(event) => {
										update.mutate(
											boosts.map((candidate) =>
												candidate.roleId === boost.roleId
													? { ...candidate, multiplier: Number(event.target.value) }
													: candidate,
											),
										);
									}}
									className={cn(SELECT, "w-auto py-1 pl-2")}
								>
									{multiplierChoices().map((value) => (
										<option key={value} value={value}>
											×{value}
										</option>
									))}
								</select>
							</label>
						</li>
					))}
				</ul>
			)}

			<Refusal error={update.error} />
		</TabPanel>
	);
}
