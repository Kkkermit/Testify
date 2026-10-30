import { Palette } from "lucide-react";
import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, Outlet } from "react-router";
import { BotMark } from "@/components/brand/BotMark";
import { LanguageSelect } from "@/components/form/LanguageSelect";
import { Backdrop } from "@/components/motion";
import { Tooltip } from "@/components/primitives";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { useBot } from "@/features/auth/useBot";
import { useMe } from "@/features/auth/useMe";
import { useSite } from "@/features/site/useSite";
import { rememberedBotName } from "@/lib/brand";
import { cn } from "@/lib/cn";

const NAV_LINK = cn(
	INLINE_TARGET,
	"rounded-chip px-1.5 text-sm font-medium whitespace-nowrap transition-colors duration-150 sm:px-2",
	"focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
);

/**
 * The landing page, the docs and the source browser: public, and the same whether or not this host has a dashboard.
 * `column` gives a page written for the dashboard's own column, Appearance, the website's margins.
 */
export function SiteShell({ column = false }: { column?: boolean }): React.JSX.Element {
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

				{/* Under the name and the sign-in until there is room, so neither is pushed off the screen. */}
				<div className="order-last flex w-full items-center gap-2 md:order-none md:w-auto md:gap-6">
					<nav aria-label={t("site.nav")} className="mr-auto flex gap-1 sm:gap-2">
						<SiteLink to="/docs">{t("site.docs")}</SiteLink>
						<SiteLink to="/source-code">{t("site.source")}</SiteLink>
					</nav>
					<div className="flex items-center gap-2">
						{/* A narrow phone has room for one control, and Appearance holds the language too. */}
						<LanguageSelect className="hidden sm:inline-flex" />
						<AppearanceLink />
					</div>
				</div>

				{site.data?.dashboard === true && <AccountLink />}
			</header>

			<main
				id="main"
				className={cn("flex-1", column && "mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-6 sm:px-6")}
			>
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

function AppearanceLink(): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<Tooltip label={t("nav.appearanceHint")}>
			<NavLink
				to="/appearance"
				aria-label={t("nav.appearance")}
				className={({ isActive }) =>
					cn(
						"border-border rounded-field inline-flex size-10 shrink-0 items-center justify-center border transition-colors duration-150",
						"focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
						isActive ? "text-foreground bg-muted" : "bg-card text-muted-foreground hover:text-foreground",
					)
				}
			>
				<Palette size={17} aria-hidden="true" />
			</NavLink>
		</Tooltip>
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
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
				<div className="flex flex-wrap items-center gap-x-6 gap-y-2">
					<Link to="/docs" className={quiet}>
						{t("site.docs")}
					</Link>
					<Link to="/source-code" className={quiet}>
						{t("site.source")}
					</Link>
					<Link to="/appearance" className={quiet}>
						{t("nav.appearance")}
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
				</div>
				{version !== undefined && (
					<span className="text-muted-foreground font-mono text-xs">{t("site.version", { version })}</span>
				)}
			</div>
		</footer>
	);
}
