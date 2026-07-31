import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { ApiError } from "@/lib/api";
import { router } from "@/routes";
import "@/index.css";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 30_000,
			// Retrying a refusal only delays the screen that explains it.
			retry: (failureCount, error) => !(error instanceof ApiError && error.status < 500) && failureCount < 2,
		},
	},
});

const root = document.getElementById("root");
if (root === null) throw new Error("index.html is missing #root, so there is nowhere to mount.");

createRoot(root).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>
	</StrictMode>,
);
