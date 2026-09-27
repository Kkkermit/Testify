import { type ServerFacts } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { Card, DataList } from "@/components/primitives";
import { VERIFICATION_LABELS } from "@/features/insights/insights.utils";
import { shortDate } from "@/lib/datetime";

export function ServerFactsCard({ server }: { server: ServerFacts }): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<Card padding="none">
			<DataList
				rows={[
					{ label: t("insights.created"), value: shortDate(server.createdAt) },
					{ label: t("insights.owner"), value: server.ownerName ?? server.ownerId },
					{
						label: t("insights.members"),
						value: t("insights.membersValue", { count: server.members, people: server.people, bots: server.bots }),
					},
					{
						label: t("insights.channels"),
						value: t("insights.channelsValue", {
							text: server.textChannels,
							voice: server.voiceChannels,
							categories: server.categories,
						}),
					},
					{ label: t("insights.roles"), value: server.roles.toLocaleString() },
					{
						label: t("insights.emojis"),
						value: t("insights.emojisValue", { emojis: server.emojis, stickers: server.stickers }),
					},
					{
						label: t("insights.boosts"),
						value: t("insights.boostsValue", { count: server.boosts, tier: server.boostTier }),
					},
					{ label: t("insights.verification"), value: t(VERIFICATION_LABELS[server.verification]) },
				]}
			/>
		</Card>
	);
}
