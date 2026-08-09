import { Link, useSearchParams } from "react-router";
import { BotBanner } from "@/components/brand/BotBanner";
import { BotMark } from "@/components/brand/BotMark";
import { Backdrop } from "@/components/motion";
import { Button, Card, Eyebrow } from "@/components/primitives";
import { SetupNeeded } from "@/features/auth/SetupNeeded";
import { useBot } from "@/features/auth/useBot";
import { useSetup } from "@/features/auth/useMe";
import { usePageTitle } from "@/hooks/usePageTitle";
import { hardRedirect } from "@/lib/redirect";

/** One button, and the two scopes named — asking for less is a feature, so say what it is. */
export function SignInPage(): React.JSX.Element {
	usePageTitle("Sign in");
	const [params] = useSearchParams();
	const setup = useSetup();
	const bot = useBot();
	const returnTo = params.get("returnTo") ?? "/guilds";

	if (setup.data?.configured === false)
		return <SetupNeeded missing={setup.data.missing} redirectUri={setup.data.redirectUri} />;

	return (
		<main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
			<Backdrop />

			<Card padding="none" className="motion-pop overflow-hidden">
				<BotBanner src={bot.data?.bannerUrl} accent={bot.data?.accentColour} className="h-24" />

				{/* Positioned, or the banner — which is — paints over the avatar lifted into it. */}
				<div className="relative flex flex-col gap-5 p-6">
					{/* Lifted into the banner, the way a profile card reads. */}
					<div className="-mt-14 flex items-end gap-3">
						<BotMark src={bot.data?.avatarUrl} size={64} className="ring-card rounded-2xl ring-4" />
						<div className="flex flex-col gap-1 pb-1">
							<Eyebrow>Sign in</Eyebrow>
							<h1 className="font-display text-2xl font-bold tracking-tight">{bot.data?.username ?? "Testify"}</h1>
						</div>
					</div>

					<p className="text-muted-foreground text-sm">
						Configure {bot.data?.username ?? "Testify"} in any server where you have Manage Server, without opening
						Discord.
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
						<strong className="text-foreground">guilds</strong> to list your servers. It never asks for your email, and
						it cannot read your messages through this.
					</p>
				</div>
			</Card>

			<p className="text-muted-foreground text-xs">
				By signing in you agree to the{" "}
				<Link to="/terms" className="hover:text-foreground underline">
					terms of use
				</Link>
				. What Testify stores is set out in the{" "}
				<Link to="/privacy" className="hover:text-foreground underline">
					privacy notice
				</Link>
				.
			</p>
		</main>
	);
}
