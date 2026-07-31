import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export type SavingState = "idle" | "saving" | "saved";

/** Idle → Saving → Saved, announced politely so a screen reader hears the outcome without stealing focus. */
export function SavingIndicator({ state }: { state: SavingState }): React.JSX.Element {
	return (
		<span
			className={cn(
				"flex items-center gap-1.5 text-xs transition-opacity duration-150",
				state === "saved" ? "text-success" : "text-muted-foreground",
				state === "idle" && "opacity-0",
			)}
			role="status"
			aria-live="polite"
		>
			{state === "saving" && <Loader2 size={13} className="animate-spin" aria-hidden="true" />}
			{state === "saved" && <Check size={13} aria-hidden="true" />}
			{state === "saving" ? "Saving…" : state === "saved" ? "Saved" : ""}
		</span>
	);
}

export function savingStateOf(pending: boolean, settled: boolean): SavingState {
	return pending ? "saving" : settled ? "saved" : "idle";
}
