import { TUNING_LIMITS } from "@testify/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { FIELD, Field, Refusal, SavingIndicator, savingStateOf, SettingRows, Toggle, Warning } from "@/components/form";
import { PageHeader, Skeleton, Summary } from "@/components/primitives";
import { RateSelect } from "@/features/economy/components/RateSelect";
import { ShopRolesSection } from "@/features/economy/components/ShopRolesSection";
import { useSaveTuning, useTuning } from "@/features/economy/useTuning";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { numberIn } from "@/features/raid-protection/raid.utils";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/cn";
import { formatNumber, formatPercent } from "@/lib/intl";

export function EconomyPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();
	const tuning = useTuning(guildId);
	const overview = useGuildOverview(guildId);
	const save = useSaveTuning(guildId);

	usePageTitle(t("economy.title"), overview.data?.name);

	if (tuning.isError) return <ErrorState error={tuning.error} onRetry={() => void tuning.refetch()} />;
	if (tuning.isPending) return <Skeleton className="h-72 w-full" />;

	const current = tuning.data;

	return (
		<>
			<PageHeader
				server={overview.data}
				title={t("economy.title")}
				subtitle={t("economy.subtitle")}
				action={<SavingIndicator state={savingStateOf(save.isPending, save.isSuccess)} />}
			/>

			<Summary>
				{t("economy.summary", {
					rate: formatPercent(current.payRate, 100),
					wallet: formatNumber(current.startingWallet),
				})}
			</Summary>

			<SettingRows>
				<RateSelect
					id="pay-rate"
					label={t("economy.payRate")}
					hint={t("economy.payRateHint")}
					value={current.payRate}
					disabled={save.isPending}
					onChange={(payRate) => {
						save.mutate({ payRate });
					}}
				/>
				<WalletField
					key={current.startingWallet}
					stored={current.startingWallet}
					onSave={(startingWallet) => {
						save.mutate({ startingWallet });
					}}
				/>
				<Toggle
					label={t("economy.robbing")}
					hint={t("economy.robbingHint")}
					checked={current.robbing}
					disabled={save.isPending}
					onChange={(robbing) => {
						save.mutate({ robbing });
					}}
				/>
			</SettingRows>
			<Refusal error={save.error} />

			<ShopRolesSection guildId={guildId} />
		</>
	);
}

function WalletField({ stored, onSave }: { stored: number; onSave: (value: number) => void }): React.JSX.Element {
	const { t } = useTranslation();
	const [text, setText] = useState(String(stored));
	const value = numberIn(text, 0, TUNING_LIMITS.maxStartingWallet);

	return (
		<Field label={t("economy.startingWallet")} htmlFor="starting-wallet" hint={t("economy.startingWalletHint")}>
			<input
				id="starting-wallet"
				inputMode="numeric"
				value={text}
				aria-invalid={value === null}
				onChange={(event) => {
					setText(event.target.value);
				}}
				onBlur={() => {
					if (value !== null && value !== stored) onSave(value);
				}}
				className={cn(FIELD, "max-w-40 font-mono tabular-nums", value === null && "border-destructive")}
			/>
			{value === null && (
				<Warning>{t("economy.walletRange", { max: formatNumber(TUNING_LIMITS.maxStartingWallet) })}</Warning>
			)}
		</Field>
	);
}
