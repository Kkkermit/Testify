import { type ComponentType, lazy, type LazyExoticComponent, Suspense } from "react";
import { createBrowserRouter } from "react-router";
import { AppShell } from "@/app/AppShell";
import { OwnerRouteError } from "@/app/OwnerRouteError";
import { ReaderShell } from "@/app/ReaderShell";
import { RequireAuth } from "@/app/RequireAuth";
import { RequireGuild } from "@/app/RequireGuild";
import { RequireOwner } from "@/app/RequireOwner";
import { RouteError } from "@/app/RouteError";
import { ScrollMemory } from "@/app/ScrollMemory";
import { Skeleton } from "@/components/primitives";
import { SignInPage } from "@/features/auth/SignInPage";
import { PRIVACY, TERMS } from "@/features/legal/legal.content";
import { NotFoundPage } from "@/features/not-found/NotFoundPage";
import { SiteShell } from "@/features/site/SiteShell";
import { followTrails } from "@/lib/trail";
// Eager: the route error screen already needs it, so a chunk of its own would save nothing.

const GuildPickerPage = page(async () => import("@/features/guilds/GuildPickerPage"), "GuildPickerPage");
const ComparePage = page(async () => import("@/features/compare/ComparePage"), "ComparePage");
const GuildOverviewPage = page(async () => import("@/features/guild-overview/GuildOverviewPage"), "GuildOverviewPage");
const LevellingPage = page(async () => import("@/features/levelling/LevellingPage"), "LevellingPage");
const WelcomePage = page(async () => import("@/features/welcome/WelcomePage"), "WelcomePage");
const AuditLogPage = page(async () => import("@/features/audit-log/AuditLogPage"), "AuditLogPage");
const LegalPage = page(async () => import("@/features/legal/LegalPage"), "LegalPage");
const SettingsPage = page(async () => import("@/features/settings/SettingsPage"), "SettingsPage");
const AutomodPage = page(async () => import("@/features/automod/AutomodPage"), "AutomodPage");
const StickyPage = page(async () => import("@/features/sticky/StickyPage"), "StickyPage");
const CasesPage = page(async () => import("@/features/cases/CasesPage"), "CasesPage");
const BirthdaysPage = page(async () => import("@/features/birthdays/BirthdaysPage"), "BirthdaysPage");
const RaidPage = page(async () => import("@/features/raid-protection/RaidPage"), "RaidPage");
const BansPage = page(async () => import("@/features/bans/BansPage"), "BansPage");
const AnnouncementsPage = page(async () => import("@/features/announcements/AnnouncementsPage"), "AnnouncementsPage");
const ChannelToolsPage = page(async () => import("@/features/channel-tools/ChannelToolsPage"), "ChannelToolsPage");
const ScheduledMessagesPage = page(
	async () => import("@/features/scheduled-messages/ScheduledMessagesPage"),
	"ScheduledMessagesPage",
);
const AutoRespondersPage = page(
	async () => import("@/features/auto-responders/AutoRespondersPage"),
	"AutoRespondersPage",
);
const RoleMenusPage = page(async () => import("@/features/role-menus/RoleMenusPage"), "RoleMenusPage");
const IdeasPage = page(async () => import("@/features/ideas/IdeasPage"), "IdeasPage");
const StarboardPage = page(async () => import("@/features/starboard/StarboardPage"), "StarboardPage");
const ChannelPage = page(async () => import("@/features/channels/ChannelPage"), "ChannelPage");
const InboxPage = page(async () => import("@/features/inbox/InboxPage"), "InboxPage");
const WeekPage = page(async () => import("@/features/week/WeekPage"), "WeekPage");
const RolesPage = page(async () => import("@/features/roles/RolesPage"), "RolesPage");
const RolePage = page(async () => import("@/features/roles/RolePage"), "RolePage");
const ChannelsPage = page(async () => import("@/features/channels/ChannelsPage"), "ChannelsPage");
const TempVoicePage = page(async () => import("@/features/temp-voice/TempVoicePage"), "TempVoicePage");
const TreasurePage = page(async () => import("@/features/treasure/TreasurePage"), "TreasurePage");
const MusicPage = page(async () => import("@/features/music/MusicPage"), "MusicPage");
const CasinoPage = page(async () => import("@/features/casino/CasinoPage"), "CasinoPage");
const TicketsPage = page(async () => import("@/features/tickets/TicketsPage"), "TicketsPage");
const WarningsPage = page(async () => import("@/features/warnings/WarningsPage"), "WarningsPage");
const ChangesPage = page(async () => import("@/features/changes/ChangesPage"), "ChangesPage");
const InsightsPage = page(async () => import("@/features/insights/InsightsPage"), "InsightsPage");
const BotStatsPage = page(async () => import("@/features/bot-stats/BotStatsPage"), "BotStatsPage");
const MemberCountPage = page(async () => import("@/features/member-count/MemberCountPage"), "MemberCountPage");
const GiveawaysPage = page(async () => import("@/features/giveaways/GiveawaysPage"), "GiveawaysPage");
const LotteryPage = page(async () => import("@/features/lottery/LotteryPage"), "LotteryPage");
const MembersPage = page(async () => import("@/features/members/MembersPage"), "MembersPage");
const MemberDetailPage = page(async () => import("@/features/members/MemberDetailPage"), "MemberDetailPage");
const CommandsPage = page(async () => import("@/features/commands/CommandsPage"), "CommandsPage");
const OwnerPage = page(async () => import("@/features/owner/OwnerPage"), "OwnerPage");
const HelpPage = page(async () => import("@/features/help/HelpPage"), "HelpPage");
const StatusPage = page(async () => import("@/features/status/StatusPage"), "StatusPage");
const NotificationsPage = page(async () => import("@/features/notices/NotificationsPage"), "NotificationsPage");
const AccountPage = page(async () => import("@/features/account/AccountPage"), "AccountPage");
const AppearancePage = page(async () => import("@/features/appearance/AppearancePage"), "AppearancePage");
const LandingPage = page(async () => import("@/features/site/LandingPage"), "LandingPage");
const DocsPage = page(async () => import("@/features/docs/DocsPage"), "DocsPage");
const SourcePage = page(async () => import("@/features/source/SourcePage"), "SourcePage");

function page<Name extends string, Props extends object>(
	load: () => Promise<Record<Name, ComponentType<Props>>>,
	name: Name,
): LazyExoticComponent<ComponentType<Props>> {
	return lazy<ComponentType<Props>>(async () => ({ default: (await load())[name] }));
}

function Loading(): React.JSX.Element {
	return <Skeleton className="h-64 w-full" />;
}

function lazily(element: React.JSX.Element): React.JSX.Element {
	return <Suspense fallback={<Loading />}>{element}</Suspense>;
}

export const routes = [
	{
		element: <SiteShell />,
		children: [
			{ path: "/", element: lazily(<LandingPage />) },
			{ path: "/docs", element: lazily(<DocsPage />) },
			{ path: "/docs/:slug", element: lazily(<DocsPage />) },
			{ path: "/docs/guides/:articleId", element: lazily(<DocsPage />) },
			{ path: "/source-code/*", element: lazily(<SourcePage />) },
		],
	},
	{
		element: <ReaderShell />,
		children: [
			{ errorElement: <RouteError />, children: [{ path: "/appearance", element: lazily(<AppearancePage />) }] },
		],
	},
	{ path: "/sign-in", element: <SignInPage /> },
	{ path: "/terms", element: lazily(<LegalPage document={TERMS} />) },
	{ path: "/privacy", element: lazily(<LegalPage document={PRIVACY} />) },
	{
		element: <RequireAuth />,
		children: [
			{
				element: <AppShell />,
				children: [
					{
						errorElement: <RouteError />,
						children: [
							{ path: "/guilds", element: lazily(<GuildPickerPage />) },
							{ path: "/guilds/compare", element: lazily(<ComparePage />) },
							{
								element: <RequireGuild />,
								children: [
									{ path: "/guilds/:guildId", element: lazily(<GuildOverviewPage />) },
									{ path: "/guilds/:guildId/insights", element: lazily(<InsightsPage />) },
									{ path: "/guilds/:guildId/levelling", element: lazily(<LevellingPage />) },
									{ path: "/guilds/:guildId/welcome", element: lazily(<WelcomePage />) },
									{ path: "/guilds/:guildId/audit-log", element: lazily(<AuditLogPage />) },
									{ path: "/guilds/:guildId/settings", element: lazily(<SettingsPage />) },
									{ path: "/guilds/:guildId/automod", element: lazily(<AutomodPage />) },
									{ path: "/guilds/:guildId/sticky", element: lazily(<StickyPage />) },
									{ path: "/guilds/:guildId/auto-responders", element: lazily(<AutoRespondersPage />) },
									{ path: "/guilds/:guildId/birthdays", element: lazily(<BirthdaysPage />) },
									{ path: "/guilds/:guildId/cases", element: lazily(<CasesPage />) },
									{ path: "/guilds/:guildId/raid-protection", element: lazily(<RaidPage />) },
									{ path: "/guilds/:guildId/bans", element: lazily(<BansPage />) },
									{ path: "/guilds/:guildId/channel-tools", element: lazily(<ChannelToolsPage />) },
									{ path: "/guilds/:guildId/announcements", element: lazily(<AnnouncementsPage />) },
									{ path: "/guilds/:guildId/scheduled-messages", element: lazily(<ScheduledMessagesPage />) },
									{ path: "/guilds/:guildId/role-menus", element: lazily(<RoleMenusPage />) },
									{ path: "/guilds/:guildId/ideas", element: lazily(<IdeasPage />) },
									{ path: "/guilds/:guildId/starboard", element: lazily(<StarboardPage />) },
									{ path: "/guilds/:guildId/channels/:channelId", element: lazily(<ChannelPage />) },
									{ path: "/guilds/:guildId/inbox", element: lazily(<InboxPage />) },
									{ path: "/guilds/:guildId/week", element: lazily(<WeekPage />) },
									{ path: "/guilds/:guildId/roles", element: lazily(<RolesPage />) },
									{ path: "/guilds/:guildId/roles/:roleId", element: lazily(<RolePage />) },
									{ path: "/guilds/:guildId/channels", element: lazily(<ChannelsPage />) },
									{ path: "/guilds/:guildId/temp-voice", element: lazily(<TempVoicePage />) },
									{ path: "/guilds/:guildId/treasure", element: lazily(<TreasurePage />) },
									{ path: "/guilds/:guildId/music", element: lazily(<MusicPage />) },
									{ path: "/guilds/:guildId/casino", element: lazily(<CasinoPage />) },
									{ path: "/guilds/:guildId/tickets", element: lazily(<TicketsPage />) },
									{ path: "/guilds/:guildId/warnings", element: lazily(<WarningsPage />) },
									{ path: "/guilds/:guildId/changes", element: lazily(<ChangesPage />) },
									{ path: "/guilds/:guildId/bot-stats", element: lazily(<BotStatsPage />) },
									{ path: "/guilds/:guildId/member-count", element: lazily(<MemberCountPage />) },
									{ path: "/guilds/:guildId/lottery", element: lazily(<LotteryPage />) },
									{ path: "/guilds/:guildId/giveaways", element: lazily(<GiveawaysPage />) },
									{ path: "/guilds/:guildId/members", element: lazily(<MembersPage />) },
									{ path: "/guilds/:guildId/members/:userId", element: lazily(<MemberDetailPage />) },
									{ path: "/guilds/:guildId/commands", element: lazily(<CommandsPage />) },
								],
							},
							{ path: "/commands", element: lazily(<CommandsPage />) },
							{ path: "/help", element: lazily(<HelpPage />) },
							{ path: "/status", element: lazily(<StatusPage />) },
							{ path: "/notifications", element: lazily(<NotificationsPage />) },
							{ path: "/account", element: lazily(<AccountPage />) },
							{
								element: <RequireOwner />,
								children: [{ path: "/owner", element: lazily(<OwnerPage />), errorElement: <OwnerRouteError /> }],
							},
						],
					},
				],
			},
		],
	},
	{ path: "*", element: <NotFoundPage /> },
];

export const router = createBrowserRouter([
	{ element: <ScrollMemory />, errorElement: <RouteError standalone />, children: routes },
]);

followTrails(router);
