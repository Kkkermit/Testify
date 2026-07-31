import { Card } from "@/components/primitives";
import { usePageTitle } from "@/hooks/usePageTitle";

/**
 * Getting this wrong is where most self-hosted dashboards lose people, so it names each missing variable and
 * the exact redirect URI to paste rather than saying "check your configuration".
 */
export function SetupNeeded({ missing, redirectUri }: { missing: string[]; redirectUri: string }): React.JSX.Element {
	usePageTitle("Finish setting up");

	return (
		<main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 p-6">
			<Card className="motion-pop flex flex-col gap-4">
				<h1 className="text-2xl font-semibold tracking-tight">Almost there</h1>
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
