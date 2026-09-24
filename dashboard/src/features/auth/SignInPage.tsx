import { Trans, useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { BotBanner } from "@/components/brand/BotBanner";
import { BotMark } from "@/components/brand/BotMark";
import { Backdrop } from "@/components/motion";
import { Button, Card, Eyebrow } from "@/components/primitives";
import { PAGE_TITLE } from "@/components/primitives/textStyles";
import { SetupNeeded } from "@/features/auth/SetupNeeded";
import { useBot } from "@/features/auth/useBot";
import { useSetup } from "@/features/auth/useMe";
import { usePageTitle } from "@/hooks/usePageTitle";
import { BUILT_IN_BOT_NAME } from "@/lib/brand";
import { hardRedirect } from "@/lib/redirect";

/** One button, and the two scopes named — asking for less is a feature, so say what it is. */
export function SignInPage(): React.JSX.Element {
	const { t } = useTranslation();
	usePageTitle(t("auth.title"));
	const [params] = useSearchParams();
	const setup = useSetup();
	const bot = useBot();
	const returnTo = params.get("returnTo") ?? "/guilds";
	const name = bot.data?.name ?? BUILT_IN_BOT_NAME;

	if (setup.data?.configured === false)
		return <SetupNeeded missing={setup.data.missing} redirectUri={setup.data.redirectUri} />;

	return (
		<main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
			<Backdrop />

			<Card padding="none" className="motion-pop overflow-hidden">
				<BotBanner src={bot.data?.bannerUrl} accent={bot.data?.accentColour} className="h-24" />

				{/* Positioned, or the banner — which is — paints over the avatar lifted into it. */}
				<div className="relative flex flex-col gap-4 p-6">
					{/* Lifted into the banner, the way a profile card reads. */}
					<div className="-mt-14 flex items-end gap-3">
						<BotMark src={bot.data?.avatarUrl} size={64} className="ring-card rounded-tile ring-4" />
						<div className="flex flex-col gap-1 pb-1">
							<Eyebrow>{t("auth.signIn")}</Eyebrow>
							<h1 className={PAGE_TITLE}>{name}</h1>
						</div>
					</div>

					<p className="text-muted-foreground text-sm">{t("auth.configureBody", { name })}</p>

					{params.get("denied") !== null && (
						<p className="text-warning text-sm" role="status">
							{t("auth.cancelled")}
						</p>
					)}

					<Button
						className="w-full"
						onClick={() => {
							hardRedirect(`/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
						}}
					>
						{t("auth.signInWith")}
					</Button>

					<p className="text-muted-foreground text-xs">
						<Trans
							i18nKey="auth.scopes"
							values={{ name }}
							components={{ scope: <strong className="text-foreground" /> }}
						/>
					</p>
				</div>
			</Card>

			<p className="text-muted-foreground text-xs">
				<Trans
					i18nKey="auth.agree"
					values={{ name }}
					components={{
						terms: <Link to="/terms" className="hover:text-foreground underline" />,
						privacy: <Link to="/privacy" className="hover:text-foreground underline" />,
					}}
				/>
			</p>
		</main>
	);
}
