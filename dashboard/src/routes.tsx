import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { AppShell } from "@/app/AppShell";
import { RequireAuth } from "@/app/RequireAuth";
import { Skeleton } from "@/components/primitives";
import { SignInPage } from "@/features/auth/SignInPage";
import { PRIVACY, TERMS } from "@/features/legal/legal.content";

// Lazy per route, so a server manager never downloads the owner console.
const GuildPickerPage = lazy(async () => ({
	default: (await import("@/features/guilds/GuildPickerPage")).GuildPickerPage,
}));
const GuildOverviewPage = lazy(async () => ({
	default: (await import("@/features/guild-overview/GuildOverviewPage")).GuildOverviewPage,
}));
const LevellingPage = lazy(async () => ({
	default: (await import("@/features/levelling/LevellingPage")).LevellingPage,
}));
const WelcomePage = lazy(async () => ({
	default: (await import("@/features/welcome/WelcomePage")).WelcomePage,
}));
const AuditLogPage = lazy(async () => ({
	default: (await import("@/features/audit-log/AuditLogPage")).AuditLogPage,
}));
const LegalPage = lazy(async () => ({ default: (await import("@/features/legal/LegalPage")).LegalPage }));
const SettingsPage = lazy(async () => ({
	default: (await import("@/features/settings/SettingsPage")).SettingsPage,
}));
const AutomodPage = lazy(async () => ({
	default: (await import("@/features/automod/AutomodPage")).AutomodPage,
}));
const StickyPage = lazy(async () => ({
	default: (await import("@/features/sticky/StickyPage")).StickyPage,
}));
const TreasurePage = lazy(async () => ({
	default: (await import("@/features/treasure/TreasurePage")).TreasurePage,
}));
const TicketsPage = lazy(async () => ({
	default: (await import("@/features/tickets/TicketsPage")).TicketsPage,
}));
const GiveawaysPage = lazy(async () => ({
	default: (await import("@/features/giveaways/GiveawaysPage")).GiveawaysPage,
}));

const LotteryPage = lazy(async () => ({
	default: (await import("@/features/lottery/LotteryPage")).LotteryPage,
}));
const MembersPage = lazy(async () => ({
	default: (await import("@/features/members/MembersPage")).MembersPage,
}));
const MemberDetailPage = lazy(async () => ({
	default: (await import("@/features/members/MemberDetailPage")).MemberDetailPage,
}));
const CommandsPage = lazy(async () => ({
	default: (await import("@/features/commands/CommandsPage")).CommandsPage,
}));
const OwnerPage = lazy(async () => ({ default: (await import("@/features/owner/OwnerPage")).OwnerPage }));
const NotFoundPage = lazy(async () => ({
	default: (await import("@/features/not-found/NotFoundPage")).NotFoundPage,
}));

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
					{ path: "/guilds/:guildId/tickets", element: lazily(<TicketsPage />) },
					{ path: "/guilds/:guildId/lottery", element: lazily(<LotteryPage />) },
					{ path: "/guilds/:guildId/giveaways", element: lazily(<GiveawaysPage />) },
					{ path: "/guilds/:guildId/members", element: lazily(<MembersPage />) },
					{ path: "/guilds/:guildId/members/:userId", element: lazily(<MemberDetailPage />) },
					{ path: "/guilds/:guildId/commands", element: lazily(<CommandsPage />) },
					{ path: "/commands", element: lazily(<CommandsPage />) },
					{ path: "/owner", element: lazily(<OwnerPage />) },
				],
			},
		],
	},
	// A real 404 rather than a redirect: bouncing an unknown address to the picker hides both a typo and a
	// dashboard link that points at nothing.
	{ path: "*", element: lazily(<NotFoundPage />) },
];

export const router = createBrowserRouter(routes);
