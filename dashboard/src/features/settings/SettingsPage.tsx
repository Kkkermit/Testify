import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { Disclosure, PageHeader, Skeleton } from "@/components/primitives";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useChannels, useRoles } from "@/features/levelling/useLevelling";
import { AntiLinkSection } from "@/features/settings/sections/AntiLinkSection";
import { AutoRoleSection } from "@/features/settings/sections/AutoRoleSection";
import { CountingSection } from "@/features/settings/sections/CountingSection";
import { NicknameSection } from "@/features/settings/sections/NicknameSection";
import { PrefixSection } from "@/features/settings/sections/PrefixSection";
import { VerificationSection } from "@/features/settings/sections/VerificationSection";
import { VoiceStatsSection } from "@/features/settings/sections/VoiceStatsSection";
import { useSettings } from "@/features/settings/useSettings";
import { usePageTitle } from "@/hooks/usePageTitle";

/** Each section writes on change and has its own endpoint, so a refusal in one leaves the others alone. */
export function SettingsPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();

	const settings = useSettings(guildId);
	const channels = useChannels(guildId);
	const roles = useRoles(guildId);
	const overview = useGuildOverview(guildId);

	usePageTitle(t("settings.title"), overview.data?.name);

	if (settings.isPending) return <Skeleton className="h-96 w-full" />;
	if (settings.isError) return <ErrorState error={settings.error} onRetry={() => void settings.refetch()} />;

	const value = settings.data;
	const shared = { guildId, channels: channels.data ?? [] };

	return (
		<>
			<PageHeader eyebrow={overview.data?.name} title={t("settings.title")} subtitle={t("settings.subtitle")} />

			<Disclosure label={t("settings.groupTestify")}>
				<Group>
					<PrefixSection guildId={guildId} value={value.prefix} />
					<NicknameSection guildId={guildId} />
				</Group>
			</Disclosure>

			<Disclosure label={t("settings.groupJoining")}>
				<Group>
					<AutoRoleSection guildId={guildId} value={value.autoRoles} roles={roles.data ?? []} />
					<VerificationSection {...shared} roles={roles.data ?? []} />
				</Group>
			</Disclosure>

			<Disclosure label={t("settings.groupModeration")}>
				<Group>
					<AntiLinkSection guildId={guildId} value={value.antiLink} />
				</Group>
			</Disclosure>

			<Disclosure label={t("settings.groupChannels")}>
				<Group>
					<VoiceStatsSection {...shared} value={value.voiceStats} />
					<CountingSection {...shared} value={value.counting} />
				</Group>
			</Disclosure>
		</>
	);
}

/**
 * One column, because every card is full width now. Two columns of cards this uneven could not balance: a
 * group with one card left half the page empty, and a short card beside a tall one left a void under it.
 */
function Group({ children }: { children: ReactNode }): React.JSX.Element {
	return <div className="flex flex-col gap-4">{children}</div>;
}
