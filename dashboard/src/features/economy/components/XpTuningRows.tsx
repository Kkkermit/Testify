import { XP_COOLDOWN_SECONDS } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { Field, Refusal, SELECT, Warning } from "@/components/form";
import { RateSelect } from "@/features/economy/components/RateSelect";
import { useSaveTuning, useTuning } from "@/features/economy/useTuning";
import { formatUnit } from "@/lib/intl";

/** The XP side of a server's tuning, shown on the levelling page where people look for it. */
export function XpTuningRows({ guildId }: { guildId: string }): React.JSX.Element | null {
	const { t } = useTranslation();
	const tuning = useTuning(guildId);
	const save = useSaveTuning(guildId);

	if (tuning.isError) return <Warning>{t("economy.couldNotRead")}</Warning>;
	if (tuning.data === undefined) return null;

	return (
		<>
			<RateSelect
				id="xp-rate"
				label={t("economy.xpRate")}
				hint={t("economy.xpRateHint")}
				value={tuning.data.xpRate}
				disabled={save.isPending}
				onChange={(xpRate) => {
					save.mutate({ xpRate });
				}}
			/>
			<Field label={t("economy.xpCooldown")} htmlFor="xp-cooldown" hint={t("economy.xpCooldownHint")}>
				<select
					id="xp-cooldown"
					className={SELECT}
					value={String(tuning.data.xpCooldownSeconds)}
					disabled={save.isPending}
					onChange={(event) => {
						const seconds = XP_COOLDOWN_SECONDS.find((choice) => String(choice) === event.target.value);
						if (seconds !== undefined) save.mutate({ xpCooldownSeconds: seconds });
					}}
				>
					{XP_COOLDOWN_SECONDS.map((seconds) => (
						<option key={seconds} value={seconds}>
							{seconds < 60
								? formatUnit(seconds, "second", { display: "long" })
								: formatUnit(seconds / 60, "minute", { display: "long" })}
						</option>
					))}
				</select>
			</Field>
			<Refusal error={save.error} />
		</>
	);
}
