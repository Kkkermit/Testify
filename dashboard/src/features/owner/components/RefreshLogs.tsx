import { AlertTriangle, Check, RefreshCw } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { describe } from "@/app/ErrorState";
import { Button } from "@/components/primitives";
import { cn } from "@/lib/cn";
import { clockTime } from "@/lib/datetime";

const REFRESHED_NOTE_MS = 5_000;

interface Read {
	isError: boolean;
	error: unknown;
}

type Outcome =
	| { state: "idle" }
	| { state: "refreshing" }
	| { state: "refreshed"; at: number }
	| { state: "failed"; error: unknown; at: number };

const timeOf = (at: number): string => clockTime(new Date(at).toISOString());

/** Reads the logs again on demand and says how that went; a failure stands until a later read of the lines works. */
export function RefreshLogs({
	refetch,
	failure,
	readAt,
	children,
}: {
	refetch: () => Promise<readonly Read[]>;
	/** Why the latest read failed, or null; only said here while older lines are still on screen. */
	failure: unknown;
	/** When the lines on screen were read, or 0 before any were. */
	readAt: number;
	/** The row's other actions, between the button and what it says. */
	children?: ReactNode;
}): React.JSX.Element {
	const { t } = useTranslation();
	const [outcome, setOutcome] = useState<Outcome>({ state: "idle" });
	const refreshing = outcome.state === "refreshing";

	useEffect(() => {
		if (outcome.state !== "refreshed") return;
		const timer = setTimeout(() => {
			setOutcome({ state: "idle" });
		}, REFRESHED_NOTE_MS);
		return () => {
			clearTimeout(timer);
		};
	}, [outcome]);

	async function refresh(): Promise<void> {
		if (refreshing) return;
		setOutcome({ state: "refreshing" });

		let failed: Read | undefined;
		try {
			failed = (await refetch()).find((read) => read.isError);
		} catch (error) {
			failed = { isError: true, error };
		}

		setOutcome(
			failed === undefined
				? { state: "refreshed", at: Date.now() }
				: { state: "failed", error: failed.error, at: Date.now() },
		);
	}

	const shownFailure =
		outcome.state === "failed" && readAt <= outcome.at
			? outcome.error
			: failure !== null && readAt > 0
				? failure
				: null;

	let note: ReactNode = null;
	if (shownFailure !== null) {
		const reason = describe(shownFailure, t).body;
		note = (
			<>
				<AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
				<span>
					{readAt > 0
						? t("owner.logsRefreshFailedStale", { reason, time: timeOf(readAt) })
						: t("owner.logsRefreshFailed", { reason })}
				</span>
			</>
		);
	} else if (outcome.state === "refreshed") {
		note = (
			<>
				<Check size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
				<span>{t("owner.logsRefreshed", { time: timeOf(outcome.at) })}</span>
			</>
		);
	}

	return (
		<div className="flex flex-wrap items-center gap-2">
			<Button variant="ghost" aria-busy={refreshing} onClick={() => void refresh()}>
				<RefreshCw size={15} aria-hidden="true" className={cn(refreshing && "animate-spin")} />
				{refreshing ? t("owner.logsRefreshing") : t("owner.logsRefresh")}
			</Button>
			{children}
			<span
				role="status"
				className={cn(
					"flex items-start gap-2 text-xs",
					shownFailure !== null ? "text-destructive-text" : "text-success",
				)}
			>
				{note}
			</span>
		</div>
	);
}
