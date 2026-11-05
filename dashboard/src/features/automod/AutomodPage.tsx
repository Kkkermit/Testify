import {
	AUTOMOD_LIMITS,
	AUTOMOD_PRESETS,
	automodBlocked,
	type AutomodCreate,
	type AutomodPreset,
} from "@testify/shared";
import { Plus, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import {
	Field,
	FIELD,
	RowActions,
	SavingIndicator,
	savingStateOf,
	SELECT,
	SettingRows,
	Warning,
} from "@/components/form";
import { Button, Card, EmptyState, PageHeader, SectionHeading, Skeleton, Summary } from "@/components/primitives";
import { PRESET_LABELS } from "@/features/automod/automod.labels";
import { automodSummary } from "@/features/automod/automod.utils";
import { RuleRow } from "@/features/automod/components/RuleRow";
import { useAddRule, useAutomod, useRemoveRule, useToggleRule } from "@/features/automod/useAutomod";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { oneOf } from "@/lib/oneOf";
import { problemText } from "@/lib/problemText";
import { markupWarning, sanitiseInput } from "@/lib/sanitise";

export function AutomodPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();

	const rules = useAutomod(guildId);
	const overview = useGuildOverview(guildId);
	const add = useAddRule(guildId);
	const toggle = useToggleRule(guildId);
	const remove = useRemoveRule(guildId);

	usePageTitle(t("automod.title"), overview.data?.name);

	const [preset, setPreset] = useState<AutomodPreset>("flagged-words");
	const [word, setWord] = useState("");
	const [limit, setLimit] = useState(5);

	if (rules.isPending) return <Skeleton className="h-96 w-full" />;
	if (rules.isError) return <ErrorState error={rules.error} onRetry={() => void rules.refetch()} />;

	const { rules: list, canManage } = rules.data;
	const blocked = problemText(automodBlocked({ preset, word, limit }), t);
	const busy = add.isPending || toggle.isPending || remove.isPending;

	function draftFor(): AutomodCreate {
		if (preset === "keyword") return { preset, word: sanitiseInput(word) };
		if (preset === "mention-spam") return { preset, limit };

		return { preset };
	}

	return (
		<>
			<PageHeader
				server={overview.data}
				title={t("automod.title")}
				subtitle={t("automod.subtitle")}
				action={<SavingIndicator state={savingStateOf(busy, add.isSuccess)} />}
			/>

			{canManage ? <Summary>{automodSummary(list, t)}</Summary> : <Warning>{t("automod.needsManageServer")}</Warning>}

			<section aria-labelledby="rules-heading" className="flex flex-col gap-3">
				<SectionHeading as="h2" id="rules-heading" count={list.length}>
					{t("automod.rules")}
				</SectionHeading>

				{list.length === 0 ? (
					<Card>
						<EmptyState
							icon={<ShieldAlert size={28} />}
							title={canManage ? t("automod.noRules") : t("automod.nothingToShow")}
							body={canManage ? t("automod.addOneBelow") : t("automod.needsPermission")}
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
				<SettingRows title={t("automod.addRule")} description={t("automod.limitsBody")}>
					<Field label={t("automod.whatToBlock")} htmlFor="automod-preset">
						<select
							id="automod-preset"
							className={SELECT}
							value={preset}
							onChange={(event) => {
								setPreset(oneOf(AUTOMOD_PRESETS, event.target.value, "flagged-words"));
							}}
						>
							{AUTOMOD_PRESETS.map((key) => (
								<option key={key} value={key}>
									{t(PRESET_LABELS[key].label)}
								</option>
							))}
						</select>
						<p className="text-muted-foreground text-xs">{t(PRESET_LABELS[preset].describes)}</p>
					</Field>

					{preset === "keyword" && (
						<Field label={t("automod.wordOrPhrase")} htmlFor="automod-word">
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
						<Field label={t("automod.mentionsToAllow")} htmlFor="automod-limit" hint={t("automod.mentionsHint")}>
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
						<Warning>{add.error instanceof ApiError ? add.error.message : t("automod.refusedRule")}</Warning>
					)}

					<RowActions>
						<Button
							disabled={blocked !== null || busy}
							onClick={() => {
								add.mutate(draftFor());
								setWord("");
							}}
						>
							<Plus size={16} aria-hidden="true" /> {t("automod.addRuleAction")}
						</Button>
					</RowActions>
				</SettingRows>
			)}

			{toggle.error !== null && (
				<Warning>{toggle.error instanceof ApiError ? toggle.error.message : t("common.couldNotChange")}</Warning>
			)}
			{remove.error !== null && (
				<Warning>{remove.error instanceof ApiError ? remove.error.message : t("common.couldNotRemove")}</Warning>
			)}
		</>
	);
}
