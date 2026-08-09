import { Card, Eyebrow } from "@/components/primitives";
import { usePageTitle } from "@/hooks/usePageTitle";

/** Names each missing variable and the exact redirect URI to paste, because this is where most self-hosted dashboards lose people. */
export function SetupNeeded({ missing, redirectUri }: { missing: string[]; redirectUri: string }): React.JSX.Element {
	usePageTitle("Finish setting up");

	return (
		<main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 p-6">
			<Card className="motion-pop flex flex-col gap-4">
				<div className="flex flex-col gap-1">
					<Eyebrow>Setup</Eyebrow>
					<h1 className="font-display text-2xl font-bold tracking-tight">Almost there</h1>
				</div>
				<p className="text-muted-foreground text-sm">
					The dashboard is switched on but cannot sign anybody in yet. Add these to your <code>.env</code> and restart
					the bot:
				</p>

				<ul className="flex flex-col gap-2">
					{missing.map((key) => (
						<li key={key} className="bg-muted rounded-lg px-3 py-2 font-mono text-sm">
							{key}
						</li>
					))}
				</ul>

				{missing.includes("DASHBOARD_SESSION_SECRET") && (
					<p className="text-muted-foreground text-sm">
						Run <code className="text-foreground">npm run secret -- --write</code> to generate that one.
					</p>
				)}

				<div>
					<p className="text-muted-foreground text-sm">
						Then add this under OAuth2 → Redirects in the Discord Developer Portal:
					</p>
					<p className="bg-muted mt-2 rounded-lg px-3 py-2 font-mono text-sm break-all">{redirectUri}</p>
				</div>
			</Card>
		</main>
	);
}
