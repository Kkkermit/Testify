import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { PageHeader } from "@/components/primitives";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { PunishmentsCard } from "@/features/warnings/components/PunishmentsCard";
import { WarningsListCard } from "@/features/warnings/components/WarningsListCard";
import { WarnMemberCard } from "@/features/warnings/components/WarnMemberCard";
import { usePageTitle } from "@/hooks/usePageTitle";

export function WarningsPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();
	const overview = useGuildOverview(guildId);

	usePageTitle(t("warnings.title"), overview.data?.name);

	return (
		<>
			<PageHeader eyebrow={overview.data?.name} title={t("warnings.title")} subtitle={t("warnings.subtitle")} />
			<PunishmentsCard guildId={guildId} />
			<WarnMemberCard guildId={guildId} />
			<WarningsListCard guildId={guildId} />
		</>
	);
}
