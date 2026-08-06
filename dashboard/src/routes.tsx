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
const StickyPage = lazy(async () => ({
	default: (await import("@/features/sticky/StickyPage")).StickyPage,
}));
const CommandsPage = lazy(async () => ({
	default: (await import("@/features/commands/CommandsPage")).CommandsPage,
}));
const OwnerPage = lazy(async () => ({ default: (await import("@/features/owner/OwnerPage")).OwnerPage }));

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
					{ path: "/guilds/:guildId/sticky", element: lazily(<StickyPage />) },
					{ path: "/guilds/:guildId/commands", element: lazily(<CommandsPage />) },
					{ path: "/commands", element: lazily(<CommandsPage />) },
					{ path: "/owner", element: lazily(<OwnerPage />) },
				],
			},
		],
	},
	{ path: "*", element: <Navigate to="/guilds" replace /> },
];

export const router = createBrowserRouter(routes);
