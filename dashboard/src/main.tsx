// First, so zod is told before any schema is built.
import "@/lib/withoutEval";
import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { applyStoredPreferences } from "@/hooks/preferences";
import { greetTheConsole } from "@/lib/consoleGreeting";
import { createQueryClient } from "@/lib/queryClient";
import { router } from "@/routes";
import "@/i18n";
import "@/index.css";

applyStoredPreferences();
void greetTheConsole();

const queryClient = createQueryClient();

const root = document.getElementById("root");
if (root === null) throw new Error("index.html is missing #root, so there is nowhere to mount.");

createRoot(root).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>
	</StrictMode>,
);
