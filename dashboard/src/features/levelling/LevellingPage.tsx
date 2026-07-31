import { LEVEL_LIMITS, type LevelRewardInput, type XpBoostInput } from "@testify/shared";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { ChannelPicker, RoleChecklist, SavingIndicator, Toggle, Warning } from "@/components/common/pickers";
import { Button, Card, PageHeader, Skeleton } from "@/components/common/primitives";
import {
	useChannels,
	useLevelling,
	useRoles,
	useUpdateBoosts,
	useUpdateIgnores,
	useUpdateRewards,
	useUpdateLevelling,
} from "@/features/levelling/useLevelling";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { usePageTitle } from "@/lib/usePageTitle";

const TABS = [
	["general", "General"],
	["rewards", "Role rewards"],
	["boosts", "XP boosts"],
	["ignores", "Ignored"],
] as const;

type Tab = (typeof TABS)[number][0];

export function LevellingPage(): React.JSX.Element {
	usePageTitle("Levelling");
	const { guildId = "" } = useParams();
	// In the URL, so a link to the rewards tab is a link to the rewards tab and Back works.
	const [params, setParams] = useSearchParams();
	const tab = tabFrom(params.get("tab"));

	const config = useLevelling(guildId);
	const channels = useChannels(guildId);
	const roles = useRoles(guildId);

	if (config.isPending) return <Skeleton className="h-96 w-full" />;
	if (config.isError) return <ErrorState error={config.error} onRetry={() => void config.refetch()} />;

	return (
		<>
			<PageHeader title="Levelling" subtitle="Who earns XP, what they get for it, and where it is announced." />

			<div role="tablist" aria-label="Levelling settings" className="border-border mb-6 flex gap-1 border-b">
				{TABS.map(([key, label]) => (
					<button
						key={key}
						type="button"
						role="tab"
						aria-selected={tab === key}
						onClick={() => {
							setParams({ tab: key });
						}}
						className={cn(
							"-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors duration-150",
							tab === key ? "border-primary text-foreground" : "text-muted-foreground border-transparent",
						)}
					>
						{label}
					</button>
				))}
			</div>

			{tab === "general" && <GeneralTab guildId={guildId} config={config.data} channels={channels.data ?? []} />}
			{tab === "rewards" && <RewardsTab guildId={guildId} rewards={config.data.rewards} roles={roles.data ?? []} />}
			{tab === "boosts" && <BoostsTab guildId={guildId} boosts={config.data.boosts} roles={roles.data ?? []} />}
			{tab === "ignores" && (
				<IgnoresTab
					guildId={guildId}
					channelIds={config.data.ignoredChannelIds}
					roleIds={config.data.ignoredRoleIds}
					channels={channels.data ?? []}
					roles={roles.data ?? []}
				/>
			)}
		</>
	);
}

export function tabFrom(raw: string | null): Tab {
	return TABS.some(([key]) => key === raw) ? (raw as Tab) : "general";
}

/** A refusal has to say why, or a control that snaps back looks like a bug rather than a permission. */
function Refusal({ error }: { error: unknown }): React.JSX.Element | null {
	if (error === null) return null;

	const message = error instanceof ApiError ? error.message : "That change could not be saved.";
	return <Warning>{message}</Warning>;
}

function stateOf(pending: boolean, settled: boolean): "idle" | "saving" | "saved" {
	return pending ? "saving" : settled ? "saved" : "idle";
}

function GeneralTab({
	guildId,
	config,
	channels,
}: {
	guildId: string;
	config: { enabled: boolean; announce: boolean; stackRewards: boolean; levelUpChannelId: string | null };
	channels: Parameters<typeof ChannelPicker>[0]["channels"];
}): React.JSX.Element {
	const update = useUpdateLevelling(guildId);

	return (
		<Card className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">General</h2>
				<SavingIndicator state={stateOf(update.isPending, update.isSuccess)} />
			</div>

			<Toggle
				label="Members earn XP"
				hint="Turning this off stops XP being awarded. Nobody loses what they already earned."
				checked={config.enabled}
				onChange={(enabled) => {
					update.mutate({ enabled });
				}}
			/>
			<Toggle
				label="Announce level-ups"
				checked={config.announce}
				onChange={(announce) => {
					update.mutate({ announce });
				}}
			/>
			<Toggle
				label="Rewards stack"
				hint="Off means only the highest reward role is kept as members level past each tier."
				checked={config.stackRewards}
				onChange={(stackRewards) => {
					update.mutate({ stackRewards });
				}}
			/>

			<ChannelPicker
				label="Announce level-ups in"
				channels={channels}
				value={config.levelUpChannelId}
				onChange={(levelUpChannelId) => {
					update.mutate({ levelUpChannelId });
				}}
			/>

			<Refusal error={update.error} />
		</Card>
	);
}

function RewardsTab({
	guildId,
	rewards,
	roles,
}: {
	guildId: string;
	rewards: LevelRewardInput[];
	roles: Parameters<typeof RoleChecklist>[0]["roles"];
}): React.JSX.Element {
	const update = useUpdateRewards(guildId);
	const [level, setLevel] = useState(5);
	const [roleId, setRoleId] = useState("");

	const assignable = roles.filter((role) => role.assignableByBot);
	const full = rewards.length >= LEVEL_LIMITS.maxRewards;

	return (
		<Card className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">Role rewards</h2>
				<SavingIndicator state={stateOf(update.isPending, update.isSuccess)} />
			</div>
			<p className="text-muted-foreground text-sm">
				A role handed out when someone reaches a level. {rewards.length} of {LEVEL_LIMITS.maxRewards} used.
			</p>

			{rewards.length === 0 ? (
				<p className="text-muted-foreground text-sm">No rewards yet.</p>
			) : (
				<ul className="divide-border border-border divide-y rounded-lg border">
					{rewards.map((reward) => (
						<li key={`${String(reward.level)}-${reward.roleId}`} className="flex items-center gap-3 px-3 py-2 text-sm">
							<span className="font-mono tabular-nums">Level {reward.level}</span>
							<span className="min-w-0 flex-1 truncate">{nameOf(roles, reward.roleId)}</span>
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

			<div className="flex flex-wrap items-end gap-2">
				<label className="text-muted-foreground text-[0.8125rem] font-medium">
					Level
					<input
						type="number"
						min={1}
						max={LEVEL_LIMITS.maxRewardLevel}
						value={level}
						onChange={(event) => {
							setLevel(Number(event.target.value));
						}}
						className="bg-card border-border mt-1 block w-24 rounded-lg border px-3 py-2 text-sm outline-none"
					/>
				</label>
				<label className="text-muted-foreground min-w-48 flex-1 text-[0.8125rem] font-medium">
					Role
					<select
						value={roleId}
						onChange={(event) => {
							setRoleId(event.target.value);
						}}
						className="bg-card border-border mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none"
					>
						<option value="">Choose a role</option>
						{assignable.map((role) => (
							<option key={role.id} value={role.id}>
								{role.name}
							</option>
						))}
					</select>
				</label>
				<Button
					disabled={roleId === "" || full || rewards.some((reward) => reward.level === level)}
					onClick={() => {
						update.mutate([...rewards, { level, roleId }]);
						setRoleId("");
					}}
				>
					<Plus size={16} aria-hidden="true" /> Add
				</Button>
			</div>

			{full && <Warning>That is the most rewards Testify can hold. Remove one to add another.</Warning>}
			{rewards.some((reward) => reward.level === level) && (
				<Warning>Level {level} already has a reward. Remove it first, or pick another level.</Warning>
			)}
			{assignable.length < roles.length && (
				<Warning>Roles above Testify in the hierarchy are hidden, because it could not grant them.</Warning>
			)}
			<Refusal error={update.error} />
		</Card>
	);
}

function BoostsTab({
	guildId,
	boosts,
	roles,
}: {
	guildId: string;
	boosts: XpBoostInput[];
	roles: Parameters<typeof RoleChecklist>[0]["roles"];
}): React.JSX.Element {
	const update = useUpdateBoosts(guildId);
	const chosen = boosts.map((boost) => boost.roleId);

	return (
		<Card className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">XP boosts</h2>
				<SavingIndicator state={stateOf(update.isPending, update.isSuccess)} />
			</div>
			<p className="text-muted-foreground text-sm">
				Members holding one of these earn more XP. Someone with several gets the highest, not the product.
			</p>

			<RoleChecklist
				label="Boost roles"
				roles={roles}
				value={chosen}
				max={LEVEL_LIMITS.maxBoosts}
				onChange={(roleIds) => {
					update.mutate(
						roleIds.map((roleId) => ({
							roleId,
							multiplier: boosts.find((boost) => boost.roleId === roleId)?.multiplier ?? 2,
						})),
					);
				}}
			/>

			{boosts.length > 0 && (
				<ul className="divide-border border-border divide-y rounded-lg border">
					{boosts.map((boost) => (
						<li key={boost.roleId} className="flex items-center gap-3 px-3 py-2 text-sm">
							<span className="min-w-0 flex-1 truncate">{nameOf(roles, boost.roleId)}</span>
							<label className="flex items-center gap-2">
								<span className="text-muted-foreground text-xs">Multiplier</span>
								<select
									aria-label={`Multiplier for ${nameOf(roles, boost.roleId)}`}
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
									className="bg-card border-border rounded-lg border px-2 py-1 text-sm outline-none"
								>
									{multipliers().map((value) => (
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
		</Card>
	);
}

function IgnoresTab({
	guildId,
	channelIds,
	roleIds,
	channels,
	roles,
}: {
	guildId: string;
	channelIds: string[];
	roleIds: string[];
	channels: Parameters<typeof ChannelPicker>[0]["channels"];
	roles: Parameters<typeof RoleChecklist>[0]["roles"];
}): React.JSX.Element {
	const update = useUpdateIgnores(guildId);

	return (
		<Card className="flex flex-col gap-6">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">Ignored channels and roles</h2>
				<SavingIndicator state={stateOf(update.isPending, update.isSuccess)} />
			</div>
			<p className="text-muted-foreground text-sm">Nothing said here, or by anyone holding these roles, earns XP.</p>

			<fieldset>
				<legend className="text-muted-foreground text-[0.8125rem] font-medium">Ignored channels</legend>
				<p className="text-muted-foreground mt-1 text-xs tabular-nums" aria-live="polite">
					{channelIds.length} of {LEVEL_LIMITS.maxIgnoredChannels} chosen
				</p>
				<div className="border-border mt-2 max-h-56 overflow-y-auto rounded-lg border">
					{channels
						.filter((channel) => channel.kind === "text" || channel.kind === "announcement")
						.map((channel) => {
							const checked = channelIds.includes(channel.id);
							const atLimit = channelIds.length >= LEVEL_LIMITS.maxIgnoredChannels;

							return (
								<label
									key={channel.id}
									className={cn("flex items-center gap-2 px-3 py-2 text-sm", atLimit && !checked && "opacity-50")}
								>
									<input
										type="checkbox"
										checked={checked}
										disabled={atLimit && !checked}
										onChange={() => {
											update.mutate({
												channelIds: checked
													? channelIds.filter((id) => id !== channel.id)
													: [...channelIds, channel.id],
												roleIds,
											});
										}}
									/>
									<span className="truncate">#{channel.name}</span>
								</label>
							);
						})}
				</div>
			</fieldset>

			<RoleChecklist
				label="Ignored roles"
				roles={roles}
				value={roleIds}
				max={LEVEL_LIMITS.maxIgnoredRoles}
				onChange={(next) => {
					update.mutate({ channelIds, roleIds: next });
				}}
			/>

			<Refusal error={update.error} />
		</Card>
	);
}

function nameOf(roles: { id: string; name: string }[], roleId: string): string {
	// A role deleted in Discord after being configured here still has to render as something.
	return roles.find((role) => role.id === roleId)?.name ?? "A deleted role";
}

function multipliers(): number[] {
	const { minMultiplier, maxMultiplier } = LEVEL_LIMITS;
	return Array.from({ length: maxMultiplier - minMultiplier + 1 }, (_, index) => minMultiplier + index);
}
