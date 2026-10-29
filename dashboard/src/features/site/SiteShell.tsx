import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, Outlet } from "react-router";
import { BotMark } from "@/components/brand/BotMark";
import { Backdrop } from "@/components/motion";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { useBot } from "@/features/auth/useBot";
import { useMe } from "@/features/auth/useMe";
import { useSite } from "@/features/site/useSite";
import { rememberedBotName } from "@/lib/brand";
import { cn } from "@/lib/cn";

const NAV_LINK = cn(
	INLINE_TARGET,
	"rounded-chip px-2 text-sm font-medium transition-colors duration-150",
	"focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
);

/** The landing page, the docs and the source browser: public, and the same whether or not this host has a dashboard. */
export function SiteShell(): React.JSX.Element {
	const { t } = useTranslation();
	const bot = useBot();
	const site = useSite();
	const name = bot.data?.name ?? rememberedBotName();

	return (
		<div className="flex min-h-dvh flex-col">
			<Backdrop opacity={0.6} />

			<header className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4 sm:px-6">
				<Link
					to="/"
					aria-label={t("site.home")}
					className={cn(INLINE_TARGET, "font-display mr-auto gap-2 text-lg font-bold tracking-tight")}
				>
					<BotMark src={bot.data?.avatarUrl} size={28} className="rounded-field" />
					{name}
				</Link>

				{/* Last on a phone, under the name and the sign-in, so neither is pushed off the screen. */}
				<nav aria-label={t("site.nav")} className="order-last flex w-full gap-2 sm:order-none sm:w-auto">
					<SiteLink to="/docs">{t("site.docs")}</SiteLink>
					<SiteLink to="/source-code">{t("site.source")}</SiteLink>
				</nav>

				{site.data?.dashboard === true && <AccountLink />}
			</header>

			<main id="main" className="flex-1">
				<Outlet />
			</main>

			<SiteFooter version={site.data?.version} repository={site.data?.repository ?? bot.data?.repositoryUrl} />
		</div>
	);
}

function SiteLink({ to, children }: { to: string; children: ReactNode }): React.JSX.Element {
	return (
		<NavLink
			to={to}
			className={({ isActive }) =>
				cn(NAV_LINK, isActive ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground")
			}
		>
			{children}
		</NavLink>
	);
}

/** Asked only where the dashboard exists, so a docs-only host never makes a request it knows will be refused. */
function AccountLink(): React.JSX.Element {
	const { t } = useTranslation();
	const me = useMe();
	const signedIn = me.data !== null && me.data !== undefined;

	return (
		<Link
			to={signedIn ? "/guilds" : "/sign-in"}
			className={cn(
				"bg-primary text-primary-foreground hover:bg-primary/90 rounded-card inline-flex min-h-10 items-center px-4 text-sm font-medium",
				"focus-visible:outline-ring transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2",
			)}
		>
			{signedIn ? t("site.openDashboard") : t("site.signIn")}
		</Link>
	);
}

function SiteFooter({
	version,
	repository,
}: {
	version: string | undefined;
	repository: string | undefined;
}): React.JSX.Element {
	const { t } = useTranslation();
	const quiet = cn(INLINE_TARGET, "text-muted-foreground hover:text-foreground text-sm");

	return (
		<footer className="border-border mt-16 border-t">
			<div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-6 sm:px-6">
				<Link to="/docs" className={quiet}>
					{t("site.docs")}
				</Link>
				<Link to="/source-code" className={quiet}>
					{t("site.source")}
				</Link>
				<Link to="/terms" className={quiet}>
					{t("site.terms")}
				</Link>
				<Link to="/privacy" className={quiet}>
					{t("site.privacy")}
				</Link>
				{repository !== undefined && (
					<a href={repository} className={quiet} rel="noreferrer">
						{t("site.github")}
					</a>
				)}
				{version !== undefined && (
					<span className="text-muted-foreground ml-auto font-mono text-xs">{t("site.version", { version })}</span>
				)}
			</div>
		</footer>
	);
}
