import { type HealthResponse } from "@testify/shared";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

type State = { status: "loading" } | { status: "ready"; health: HealthResponse } | { status: "failed"; why: string };

export function App(): React.JSX.Element {
	const [state, setState] = useState<State>({ status: "loading" });

	useEffect(() => {
		let live = true;

		api
			.get<HealthResponse>("/health")
			.then((health) => {
				if (live) setState({ status: "ready", health });
			})
			.catch((error: unknown) => {
				if (live) setState({ status: "failed", why: error instanceof ApiError ? error.message : "The API is not up." });
			});

		return () => {
			live = false;
		};
	}, []);

	return (
		<main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 p-6">
			<header>
				<h1 className="text-2xl font-semibold">Testify</h1>
				<p className="text-muted-foreground text-sm">Dashboard</p>
			</header>

			<section aria-labelledby="status-heading" className="bg-card border-border rounded-[--radius] border p-5">
				<h2 id="status-heading" className="text-lg font-semibold">
					Connection
				</h2>
				{state.status === "loading" && (
					<p className="text-muted-foreground mt-2 text-sm" role="status">
						Checking the bot…
					</p>
				)}
				{state.status === "failed" && (
					<p className="text-destructive mt-2 text-sm" role="status">
						{state.why}
					</p>
				)}
				{state.status === "ready" && <HealthList health={state.health} />}
			</section>
		</main>
	);
}

function HealthList({ health }: { health: HealthResponse }): React.JSX.Element {
	return (
		<dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm" role="status">
			<dt className="text-muted-foreground">Discord</dt>
			<dd className={health.discord === "ready" ? "text-success" : "text-warning"}>{health.discord}</dd>

			<dt className="text-muted-foreground">Database</dt>
			<dd className={health.database === "connected" ? "text-success" : "text-destructive"}>{health.database}</dd>

			<dt className="text-muted-foreground">Uptime</dt>
			<dd>{Math.floor(health.uptimeMs / 1000)}s</dd>
		</dl>
	);
}
