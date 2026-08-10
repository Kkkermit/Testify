import { type ReactNode } from "react";
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
				eyebrow={overview.data?.name}
				title="Server settings"
				subtitle="The switches that do not have a screen of their own."
			/>

			<Disclosure label="Testify in this server">
				<Group>
					<PrefixSection guildId={guildId} value={value.prefix} />
					<NicknameSection guildId={guildId} />
				</Group>
			</Disclosure>

			<Disclosure label="Joining">
				<Group>
					<AutoRoleSection guildId={guildId} value={value.autoRoles} roles={roles.data ?? []} />
					<VerificationSection {...shared} roles={roles.data ?? []} />
				</Group>
			</Disclosure>

			<Disclosure label="Moderation">
				<Group>
					<AntiLinkSection guildId={guildId} value={value.antiLink} />
				</Group>
			</Disclosure>

			<Disclosure label="Channels">
				<Group>
					{/* Counting is twice the height of the other, and a column can only take a prefix of this order. */}
					<VoiceStatsSection {...shared} value={value.voiceStats} />
					<CountingSection {...shared} value={value.counting} />
				</Group>
			</Disclosure>
		</>
	);
}

/** Columns, because a grid row is as tall as its tallest cell; `gap` does not apply here, so each card carries its own margin. */
function Group({ children }: { children: ReactNode }): React.JSX.Element {
	return <div className="-mb-4 gap-x-4 lg:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">{children}</div>;
}
