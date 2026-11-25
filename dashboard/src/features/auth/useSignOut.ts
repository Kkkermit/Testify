import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { hardRedirect } from "@/lib/redirect";

/** Leaves for the sign-in page once the session is gone, so a failed request never looks like a sign-out. */
export function useSignOut(): { signOut: () => void; busy: boolean; failed: boolean } {
	const queryClient = useQueryClient();
	const [state, setState] = useState<"idle" | "busy" | "failed">("idle");

	// Cleared, or the next person at this browser sees the last one's servers; nothing re-renders after it.
	const leave = (): void => {
		queryClient.clear();
		hardRedirect("/sign-in");
	};

	const signOut = (): void => {
		setState("busy");
		void api.post("/auth/logout").then(leave, (error: unknown) => {
			if (error instanceof ApiError && error.status === 401) leave();
			else setState("failed");
		});
	};

	return { signOut, busy: state === "busy", failed: state === "failed" };
}
