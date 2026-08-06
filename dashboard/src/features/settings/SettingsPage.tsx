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
import { VerificationSection } from "@/features/settings/sections/VerificationSection";
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
				subtitle="The smaller switches: prefix, link filtering, joins, verification and counting."
			/>

			{/*
			 * Columns rather than a grid: these cards are two to ten rows tall, and a grid row is as tall as its
			 * tallest cell — which left a card-sized hole under every short one. `gap` does not apply between items
			 * in a column layout, so the space below each card is its own margin.
			 */}
			<div className="gap-x-4 lg:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
				<PrefixSection guildId={guildId} value={value.prefix} />
				<NicknameSection guildId={guildId} />
				<AntiLinkSection guildId={guildId} value={value.antiLink} />
				<AutoRoleSection guildId={guildId} value={value.autoRoles} roles={roles.data ?? []} />
				<VerificationSection {...shared} roles={roles.data ?? []} />
				<CountingSection {...shared} value={value.counting} />
				<VoiceStatsSection {...shared} value={value.voiceStats} />
			</div>
		</>
	);
}
