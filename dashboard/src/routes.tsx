import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/app/AppShell";
import { RequireAuth } from "@/app/RequireAuth";
import { Skeleton } from "@/components/common/primitives";
import { SignInPage } from "@/features/auth/SignInPage";

// Lazy per route, so a server manager never downloads the owner console.
const GuildPickerPage = lazy(async () => ({
	default: (await import("@/features/guilds/GuildPickerPage")).GuildPickerPage,
}));
const GuildOverviewPage = lazy(async () => ({
	default: (await import("@/features/guild-overview/GuildOverviewPage")).GuildOverviewPage,
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
	{
		element: <RequireAuth />,
		children: [
			{
				element: <AppShell />,
				children: [
					{ path: "/guilds", element: lazily(<GuildPickerPage />) },
					{ path: "/guilds/:guildId", element: lazily(<GuildOverviewPage />) },
					{ path: "/owner", element: lazily(<OwnerPage />) },
				],
			},
		],
	},
	{ path: "*", element: <Navigate to="/guilds" replace /> },
];

export const router = createBrowserRouter(routes);
