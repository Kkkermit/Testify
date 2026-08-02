import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { PageHeader, Skeleton } from "@/components/primitives";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useChannels, useRoles } from "@/features/levelling/useLevelling";
import { AntiLinkSection } from "@/features/settings/sections/AntiLinkSection";
import { AutoRoleSection } from "@/features/settings/sections/AutoRoleSection";
import { CountingSection } from "@/features/settings/sections/CountingSection";
import { NicknameSection } from "@/features/settings/sections/NicknameSection";
import { PrefixSection } from "@/features/settings/sections/PrefixSection";
import { VoiceStatsSection } from "@/features/settings/sections/VoiceStatsSection";
import { useSettings } from "@/features/settings/useSettings";
import { usePageTitle } from "@/hooks/usePageTitle";

/**
 * Each section writes on change and has its own endpoint, so a refusal in one leaves the others alone — the
 * apply-immediately side of the split in `CLAUDE.md` §24.
 */
export function SettingsPage(): React.JSX.Element {
	const { guildId = "" } = useParams();

	const settings = useSettings(guildId);
	const channels = useChannels(guildId);
	const roles = useRoles(guildId);
	const overview = useGuildOverview(guildId);

	usePageTitle("Server settings", overview.data?.name);

	if (settings.isPending) return <Skeleton className="h-96 w-full" />;
	if (settings.isError) return <ErrorState error={settings.error} onRetry={() => void settings.refetch()} />;

	const value = settings.data;
	const shared = { guildId, channels: channels.data ?? [] };

	return (
		<>
			<PageHeader
				title="Server settings"
				subtitle="The smaller switches: prefix, link filtering, joins and counting."
			/>

			<div className="grid items-start gap-4 lg:grid-cols-2">
				<PrefixSection guildId={guildId} value={value.prefix} />
				<NicknameSection guildId={guildId} />
				<AntiLinkSection guildId={guildId} value={value.antiLink} />
				<AutoRoleSection guildId={guildId} value={value.autoRoles} roles={roles.data ?? []} />
				<CountingSection {...shared} value={value.counting} />
				<VoiceStatsSection {...shared} value={value.voiceStats} />
			</div>
		</>
	);
}
