import commandList from "@repo/docs/commands.md?raw";
import { inviteUrl } from "@testify/shared";
import { ArrowRight } from "lucide-react";
import { useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button, Card, CARD_HEADING, Eyebrow } from "@/components/primitives";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { featureLook } from "@/config/features";
import { useBot } from "@/features/auth/useBot";
import { useMe } from "@/features/auth/useMe";
import { Composer } from "@/features/site/components/Composer";
import { paletteFrom } from "@/features/site/composer.utils";
import { FEATURES, SELF_HOST_STEPS } from "@/features/site/landing.content";
import { useSite } from "@/features/site/useSite";
import { usePageTitle } from "@/hooks/usePageTitle";
import { rememberedBotName } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { hardRedirect } from "@/lib/redirect";

const SECONDARY = cn(
	"bg-muted text-foreground hover:bg-muted/70 border-border rounded-card inline-flex min-h-11 items-center",
	"justify-center gap-2 border px-4 py-2 text-sm font-medium transition-colors duration-150",
	"focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
);
const PRIMARY_LINK = cn(
	"bg-primary text-primary-foreground hover:bg-primary/90 rounded-card inline-flex min-h-11 items-center",
	"justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors duration-150",
	"focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
);
const SECTION_TITLE = "font-display text-2xl leading-tight font-bold tracking-tight";

/** The front door: what the bot is in one line, signing in as the one thing to do, and the docs and code behind it. */
export function LandingPage(): React.JSX.Element {
	const { t } = useTranslation();
	usePageTitle(t("landing.pageTitle"));
	const site = useSite();
	const bot = useBot();
	const palette = useMemo(() => paletteFrom(commandList), []);
	const name = bot.data?.name ?? rememberedBotName() ?? "";
	const invite = bot.data === undefined ? null : inviteUrl(bot.data.id);

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col px-4 sm:px-6">
			<section
				aria-labelledby="landing-title"
				className="grid items-center gap-6 py-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:py-20 [&>*]:min-w-0"
			>
				<div className="motion-reveal flex flex-col gap-6">
					<Eyebrow>{t("landing.eyebrow")}</Eyebrow>
					<h1
						id="landing-title"
						className="font-display text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl"
					>
						{t("landing.title")}
					</h1>
					<p className="text-muted-foreground max-w-xl text-lg text-pretty">{t("landing.lede")}</p>

					{site.data?.dashboard === true ? (
						<SignedInAware invite={invite} name={name} />
					) : (
						<div className="flex flex-wrap gap-3">
							{invite !== null && (
								<a href={invite} className={PRIMARY_LINK}>
									{t("landing.invite")}
								</a>
							)}
							<Link to="/docs" className={SECONDARY}>
								{t("landing.runYourOwn")}
							</Link>
						</div>
					)}
				</div>

				<Composer palette={palette} />
			</section>

			<section aria-labelledby="landing-features" className="flex flex-col gap-6 py-10">
				<h2 id="landing-features" className={SECTION_TITLE}>
					{t("landing.featuresTitle")}
				</h2>
				<ul className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3 [&>li]:min-w-0">
					{FEATURES.map((feature) => {
						const look = featureLook(feature.look);
						const Icon = look.icon;
						return (
							<li key={feature.look}>
								<Card className="flex h-full flex-col gap-3">
									<span className={cn("rounded-field flex size-10 items-center justify-center", look.wash)}>
										<Icon size={20} aria-hidden="true" className={look.tint} />
									</span>
									<h3 className={CARD_HEADING}>{t(feature.titleKey)}</h3>
									<p className="text-muted-foreground text-sm">{t(feature.bodyKey)}</p>
								</Card>
							</li>
						);
					})}
				</ul>
			</section>

			<section aria-label={t("landing.openSource")} className="grid gap-4 py-10 lg:grid-cols-2">
				<Card className="flex flex-col gap-4">
					<h2 className={SECTION_TITLE}>{t("landing.selfHost.title")}</h2>
					<p className="text-muted-foreground text-sm">{t("landing.selfHost.body")}</p>
					<ol className="flex flex-col gap-2">
						{SELF_HOST_STEPS.map((step, index) => (
							<li key={step.slug}>
								<Link
									to={`/docs/${step.slug}`}
									className={cn(INLINE_TARGET, "hover:text-accent group gap-3 text-sm font-medium")}
								>
									<span className="text-muted-foreground font-mono text-xs tabular-nums">{index + 1}</span>
									{t(step.labelKey)}
									<ArrowRight
										size={14}
										aria-hidden="true"
										className="text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5"
									/>
								</Link>
							</li>
						))}
					</ol>
				</Card>

				<Card className="flex flex-col gap-4">
					<h2 className={SECTION_TITLE}>{t("landing.source.title")}</h2>
					<p className="text-muted-foreground text-sm">
						{t("landing.source.body", { version: site.data?.version ?? "" })}
					</p>
					<Link to="/source-code" className={cn(SECONDARY, "mt-auto self-start")}>
						{t("landing.source.browse")}
					</Link>
				</Card>
			</section>
		</div>
	);
}

/** Signing in is the page's one job, so the primary action is it until it is done, and then the servers it opens. */
function SignedInAware({ invite, name }: { invite: string | null; name: string }): React.JSX.Element {
	const { t } = useTranslation();
	const me = useMe();
	const signedIn = me.data !== null && me.data !== undefined;

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap gap-3">
				{signedIn ? (
					<Link to="/guilds" className={PRIMARY_LINK}>
						{t("site.openDashboard")}
					</Link>
				) : (
					<Button
						onClick={() => {
							hardRedirect(`/api/auth/login?returnTo=${encodeURIComponent("/guilds")}`);
						}}
					>
						{t("auth.signInWith")}
					</Button>
				)}
				{invite !== null && (
					<a href={invite} className={SECONDARY}>
						{t("landing.invite")}
					</a>
				)}
			</div>
			{!signedIn && (
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
			)}
		</div>
	);
}
