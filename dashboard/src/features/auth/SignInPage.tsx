import { useSearchParams } from "react-router";
import { LogoTile } from "@/components/brand/Logo";
import { Backdrop } from "@/components/motion";
import { Button, Card } from "@/components/primitives";
import { SetupNeeded } from "@/features/auth/SetupNeeded";
import { useSetup } from "@/features/auth/useMe";
import { usePageTitle } from "@/hooks/usePageTitle";
import { hardRedirect } from "@/lib/redirect";

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
			<Backdrop />

			<Card className="motion-pop flex flex-col gap-5">
				<div className="flex items-center gap-3">
					<LogoTile />
					<h1 className="text-2xl font-semibold tracking-tight">Testify</h1>
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
