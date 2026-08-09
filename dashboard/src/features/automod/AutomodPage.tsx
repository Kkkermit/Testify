import {
	AUTOMOD_LIMITS,
	AUTOMOD_PRESET_LABELS,
	AUTOMOD_PRESETS,
	automodBlocked,
	type AutomodCreate,
	type AutomodPreset,
} from "@testify/shared";
import { Plus, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { Field, FIELD, SavingIndicator, savingStateOf, SELECT, Warning } from "@/components/form";
import { Button, Card, EmptyState, Eyebrow, PageHeader, Skeleton } from "@/components/primitives";
import { CARD_HEADING } from "@/components/primitives/textStyles";
import { RuleRow } from "@/features/automod/components/RuleRow";
import { useAddRule, useAutomod, useRemoveRule, useToggleRule } from "@/features/automod/useAutomod";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { markupWarning, sanitiseInput } from "@/lib/sanitise";

export function AutomodPage(): React.JSX.Element {
	const { guildId = "" } = useParams();

	const rules = useAutomod(guildId);
	const overview = useGuildOverview(guildId);
	const add = useAddRule(guildId);
	const toggle = useToggleRule(guildId);
	const remove = useRemoveRule(guildId);

	usePageTitle("AutoMod", overview.data?.name);

	const [preset, setPreset] = useState<AutomodPreset>("flagged-words");
	const [word, setWord] = useState("");
	const [limit, setLimit] = useState(5);

	if (rules.isPending) return <Skeleton className="h-96 w-full" />;
	if (rules.isError) return <ErrorState error={rules.error} onRetry={() => void rules.refetch()} />;

	const { rules: list, canManage } = rules.data;
	const blocked = automodBlocked({ preset, word, limit });
	const busy = add.isPending || toggle.isPending || remove.isPending;

	function draftFor(): AutomodCreate {
		if (preset === "keyword") return { preset, word: sanitiseInput(word) };
		if (preset === "mention-spam") return { preset, limit };

		return { preset };
	}

	return (
		<>
			<PageHeader
				title="AutoMod"
				subtitle="Discord’s own message filters. Testify sets them up; Discord enforces them."
				action={<SavingIndicator state={savingStateOf(busy, add.isSuccess)} />}
			/>

			{!canManage && (
				<Warning>
					Testify needs the Manage Server permission before it can read or change AutoMod rules in this server.
				</Warning>
			)}

			<section aria-labelledby="rules-heading" className="flex flex-col gap-3">
				<Eyebrow as="h2" id="rules-heading" count={list.length}>
					Rules
				</Eyebrow>

				{list.length === 0 ? (
					<Card>
						<EmptyState
							icon={<ShieldAlert size={28} />}
							title={canManage ? "No AutoMod rules yet" : "Nothing to show"}
							body={
								canManage
									? "Add one below, and Discord blocks matching messages before anyone reads them."
									: "Grant Testify the Manage Server permission to see this server’s rules."
							}
						/>
					</Card>
				) : (
					<ul className="flex flex-col gap-3">
						{list.map((rule) => (
							<RuleRow
								key={rule.id}
								rule={rule}
								busy={busy}
								onToggle={(enabled) => {
									toggle.mutate({ ruleId: rule.id, enabled });
								}}
								onRemove={() => {
									remove.mutate({ ruleId: rule.id });
								}}
							/>
						))}
					</ul>
				)}
			</section>

			{canManage && (
				<Card className="motion-pop flex flex-col gap-4">
					<div>
						<h2 className={CARD_HEADING}>Add a rule</h2>
						<p className="text-muted-foreground text-sm">
							Discord allows a handful of each kind. It refuses the rest, and this says so when it does.
						</p>
					</div>

					<Field label="What to block" htmlFor="automod-preset">
						<select
							id="automod-preset"
							className={SELECT}
							value={preset}
							onChange={(event) => {
								setPreset(event.target.value as AutomodPreset);
							}}
						>
							{AUTOMOD_PRESETS.map((key) => (
								<option key={key} value={key}>
									{AUTOMOD_PRESET_LABELS[key].label}
								</option>
							))}
						</select>
						<p className="text-muted-foreground text-xs">{AUTOMOD_PRESET_LABELS[preset].describes}</p>
					</Field>

					{preset === "keyword" && (
						<Field label="Word or phrase" htmlFor="automod-word">
							<input
								id="automod-word"
								value={word}
								maxLength={AUTOMOD_LIMITS.maxKeyword}
								onChange={(event) => {
									setWord(event.target.value);
								}}
								className={cn(FIELD, "max-w-80")}
							/>
						</Field>
					)}

					{preset === "mention-spam" && (
						<Field label="Mentions to allow" htmlFor="automod-limit" hint="A message with more is blocked.">
							<input
								id="automod-limit"
								type="number"
								inputMode="numeric"
								min={AUTOMOD_LIMITS.minMentions}
								max={AUTOMOD_LIMITS.maxMentions}
								value={limit}
								onChange={(event) => {
									setLimit(Number(event.target.value));
								}}
								className={cn(FIELD, "w-24")}
							/>
						</Field>
					)}

					{preset === "keyword" && markupWarning(word) !== null && <Warning>{markupWarning(word)}</Warning>}
					{blocked !== null && word !== "" && <Warning>{blocked}</Warning>}
					{add.error !== null && (
						<Warning>{add.error instanceof ApiError ? add.error.message : "Discord refused that rule."}</Warning>
					)}

					<div>
						<Button
							disabled={blocked !== null || busy}
							onClick={() => {
								add.mutate(draftFor());
								setWord("");
							}}
						>
							<Plus size={16} aria-hidden="true" /> Add rule
						</Button>
					</div>
				</Card>
			)}

			{toggle.error !== null && (
				<Warning>{toggle.error instanceof ApiError ? toggle.error.message : "That could not be changed."}</Warning>
			)}
			{remove.error !== null && (
				<Warning>{remove.error instanceof ApiError ? remove.error.message : "That could not be removed."}</Warning>
			)}
		</>
	);
}
