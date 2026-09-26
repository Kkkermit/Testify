import { type ComponentType, lazy, type LazyExoticComponent, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { AppShell } from "@/app/AppShell";
import { RequireAuth } from "@/app/RequireAuth";
import { RequireOwner } from "@/app/RequireOwner";
import { RouteError } from "@/app/RouteError";
import { Skeleton } from "@/components/primitives";
import { SignInPage } from "@/features/auth/SignInPage";
import { PRIVACY, TERMS } from "@/features/legal/legal.content";
// Eager: the shell already needs it for the owner console's disguise, so a chunk of its own would save nothing.
import { NotFoundPage } from "@/features/not-found/NotFoundPage";

// Lazy per route, so a server manager never downloads the owner console.
const GuildPickerPage = page(async () => import("@/features/guilds/GuildPickerPage"), "GuildPickerPage");
const GuildOverviewPage = page(async () => import("@/features/guild-overview/GuildOverviewPage"), "GuildOverviewPage");
const LevellingPage = page(async () => import("@/features/levelling/LevellingPage"), "LevellingPage");
const WelcomePage = page(async () => import("@/features/welcome/WelcomePage"), "WelcomePage");
const AuditLogPage = page(async () => import("@/features/audit-log/AuditLogPage"), "AuditLogPage");
const LegalPage = page(async () => import("@/features/legal/LegalPage"), "LegalPage");
const SettingsPage = page(async () => import("@/features/settings/SettingsPage"), "SettingsPage");
const AutomodPage = page(async () => import("@/features/automod/AutomodPage"), "AutomodPage");
const StickyPage = page(async () => import("@/features/sticky/StickyPage"), "StickyPage");
const TreasurePage = page(async () => import("@/features/treasure/TreasurePage"), "TreasurePage");
const MusicPage = page(async () => import("@/features/music/MusicPage"), "MusicPage");
const TicketsPage = page(async () => import("@/features/tickets/TicketsPage"), "TicketsPage");
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
const AppearancePage = page(async () => import("@/features/appearance/AppearancePage"), "AppearancePage");

/** A lazy route component from one named export, which is how every feature module exposes its page. */
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
	{ path: "/", element: <Navigate to="/guilds" replace /> },
	{ path: "/sign-in", element: <SignInPage /> },
	// Outside RequireAuth: somebody deciding whether to add the bot has to be able to read these first.
	{ path: "/terms", element: lazily(<LegalPage document={TERMS} />) },
	{ path: "/privacy", element: lazily(<LegalPage document={PRIVACY} />) },
	{
		element: <RequireAuth />,
		children: [
			{
				element: <AppShell />,
				// A page that fails renders inside the shell, so the sidebar is still there to leave by.
				children: [
					{
						errorElement: <RouteError />,
						children: [
							{ path: "/guilds", element: lazily(<GuildPickerPage />) },
							{ path: "/guilds/:guildId", element: lazily(<GuildOverviewPage />) },
							{ path: "/guilds/:guildId/levelling", element: lazily(<LevellingPage />) },
							{ path: "/guilds/:guildId/welcome", element: lazily(<WelcomePage />) },
							{ path: "/guilds/:guildId/audit-log", element: lazily(<AuditLogPage />) },
							{ path: "/guilds/:guildId/settings", element: lazily(<SettingsPage />) },
							{ path: "/guilds/:guildId/automod", element: lazily(<AutomodPage />) },
							{ path: "/guilds/:guildId/sticky", element: lazily(<StickyPage />) },
							{ path: "/guilds/:guildId/treasure", element: lazily(<TreasurePage />) },
							{ path: "/guilds/:guildId/music", element: lazily(<MusicPage />) },
							{ path: "/guilds/:guildId/tickets", element: lazily(<TicketsPage />) },
							{ path: "/guilds/:guildId/bot-stats", element: lazily(<BotStatsPage />) },
							{ path: "/guilds/:guildId/member-count", element: lazily(<MemberCountPage />) },
							{ path: "/guilds/:guildId/lottery", element: lazily(<LotteryPage />) },
							{ path: "/guilds/:guildId/giveaways", element: lazily(<GiveawaysPage />) },
							{ path: "/guilds/:guildId/members", element: lazily(<MembersPage />) },
							{ path: "/guilds/:guildId/members/:userId", element: lazily(<MemberDetailPage />) },
							{ path: "/guilds/:guildId/commands", element: lazily(<CommandsPage />) },
							{ path: "/commands", element: lazily(<CommandsPage />) },
							{ path: "/help", element: lazily(<HelpPage />) },
							{ path: "/status", element: lazily(<StatusPage />) },
							{ path: "/appearance", element: lazily(<AppearancePage />) },
							// Behind its own guard, so the console's existence is not disclosed by rendering its shell.
							{ element: <RequireOwner />, children: [{ path: "/owner", element: lazily(<OwnerPage />) }] },
						],
					},
				],
			},
		],
	},
	// A real 404 rather than a redirect, which would hide a typo or a dead link.
	{ path: "*", element: <NotFoundPage /> },
];

// Anything the shell cannot catch — the sign-in page, the gate itself — still gets a page rather than the router's own.
export const router = createBrowserRouter([{ errorElement: <RouteError standalone />, children: routes }]);
