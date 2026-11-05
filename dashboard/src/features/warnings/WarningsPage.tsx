import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { PageHeader, Summary } from "@/components/primitives";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { PunishmentsCard } from "@/features/warnings/components/PunishmentsCard";
import { WarningsListCard } from "@/features/warnings/components/WarningsListCard";
import { WarnMemberCard } from "@/features/warnings/components/WarnMemberCard";
import { usePunishments } from "@/features/warnings/useWarnings";
import { warningsSummary } from "@/features/warnings/warnings.utils";
import { usePageTitle } from "@/hooks/usePageTitle";

export function WarningsPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();
	const overview = useGuildOverview(guildId);
	const punishments = usePunishments(guildId);

	usePageTitle(t("warnings.title"), overview.data?.name);

	return (
		<>
			<PageHeader server={overview.data} title={t("warnings.title")} subtitle={t("warnings.subtitle")} />
			{punishments.data !== undefined && <Summary>{warningsSummary(punishments.data.steps, t)}</Summary>}
			<PunishmentsCard guildId={guildId} />
			<WarnMemberCard guildId={guildId} />
			<WarningsListCard guildId={guildId} />
		</>
	);
}
