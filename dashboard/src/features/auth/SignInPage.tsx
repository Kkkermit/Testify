import { ShieldCheck } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Button, Card } from "@/components/common/primitives";
import { useSetup } from "@/features/auth/useMe";
import { hardRedirect } from "@/lib/redirect";
import { usePageTitle } from "@/lib/usePageTitle";

/** One button, the two scopes named and why, and nothing else. Asking for less is a feature, so say what it is. */
export function SignInPage(): React.JSX.Element {
	usePageTitle("Sign in");
	const [params] = useSearchParams();
	const setup = useSetup();
	const returnTo = params.get("returnTo") ?? "/guilds";

	if (setup.data?.configured === false)
		return <SetupNeeded missing={setup.data.missing} redirectUri={setup.data.redirectUri} />;

	return (
		<main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
			<Card className="flex flex-col gap-5">
				<div className="flex items-center gap-3">
					<ShieldCheck className="text-accent" size={28} aria-hidden="true" />
					<h1 className="text-2xl font-semibold">Testify</h1>
				</div>

				<p className="text-muted-foreground text-sm">
					Configure Testify in any server where you have Manage Server, without opening Discord.
				</p>

				{params.get("denied") !== null && (
					<p className="text-warning text-sm" role="status">
						You cancelled the Discord sign-in. Nothing was shared.
					</p>
				)}

				<Button
					className="w-full"
					onClick={() => {
						hardRedirect(`/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
					}}
				>
					Sign in with Discord
				</Button>

				<p className="text-muted-foreground text-xs">
					Testify asks for <strong className="text-foreground">identify</strong> to know who you are and{" "}
					<strong className="text-foreground">guilds</strong> to list your servers. It never asks for your email, and it
					cannot read your messages through this.
				</p>
			</Card>
		</main>
	);
}

/**
 * Getting this wrong is where most self-hosted dashboards lose people, so it names each missing variable and
 * the exact redirect URI to paste rather than saying "check your configuration".
 */
function SetupNeeded({ missing, redirectUri }: { missing: string[]; redirectUri: string }): React.JSX.Element {
	usePageTitle("Finish setting up");

	return (
		<main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 p-6">
			<Card className="flex flex-col gap-4">
				<h1 className="text-2xl font-semibold">Almost there</h1>
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
