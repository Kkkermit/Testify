import { Languages, Monitor, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, PageHeader, SegmentedControl } from "@/components/primitives";
import { CARD_HEADING } from "@/components/primitives/textStyles";
import { ThemePreview } from "@/features/appearance/components/ThemePreview";
import { usePageTitle } from "@/hooks/usePageTitle";
import { THEMES, useTheme, type Theme } from "@/hooks/useTheme";
import { isLocale, LOCALE_NAMES, LOCALES, type Locale } from "@/i18n";
import { cn } from "@/lib/cn";

const THEME_ICON: Record<Theme, typeof Sun> = { system: Monitor, light: Sun, dark: Moon };

export function AppearancePage(): React.JSX.Element {
	const { t, i18n } = useTranslation();
	usePageTitle(t("appearance.title"));
	const { theme, setTheme } = useTheme();

	const active: Locale = isLocale(i18n.resolvedLanguage) ? i18n.resolvedLanguage : "en";

	return (
		<div className="flex flex-col gap-6">
			<PageHeader title={t("appearance.title")} subtitle={t("appearance.subtitle")} />

			<Card className="flex flex-col gap-4">
				<div>
					<h2 className={CARD_HEADING}>{t("appearance.theme")}</h2>
					<p className="text-muted-foreground text-sm">{t("appearance.themeDescribes")}</p>
				</div>

				{/* A group of three sits at its content width; stretched across the card it reads as a tab bar. */}
				<div className="flex">
					<SegmentedControl
						label={t("appearance.theme")}
						value={theme}
						onChange={setTheme}
						segments={THEMES.map((name) => ({
							value: name,
							label: t(`appearance.${name}`),
							hint: t(
								name === "system"
									? "appearance.systemHint"
									: name === "light"
										? "appearance.alwaysLight"
										: "appearance.alwaysDark",
							),
						}))}
					/>
				</div>

				<div className="grid gap-3 sm:grid-cols-3">
					{THEMES.map((name) => (
						<ThemePreview key={name} theme={name} icon={THEME_ICON[name]} selected={theme === name} />
					))}
				</div>
			</Card>

			<Card className="flex flex-col gap-4">
				<div>
					<h2 className={CARD_HEADING}>{t("appearance.language")}</h2>
					<p className="text-muted-foreground text-sm">{t("appearance.languageDescribes")}</p>
				</div>

				<ul className="grid gap-2 sm:grid-cols-2">
					{LOCALES.map((locale) => (
						<li key={locale}>
							<button
								type="button"
								aria-pressed={active === locale}
								onClick={() => void i18n.changeLanguage(locale)}
								className={cn(
									"rounded-card flex w-full items-center gap-3 border px-3 py-2 text-sm transition-colors duration-150",
									"focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
									active === locale
										? "border-primary bg-primary/10 text-foreground"
										: "border-border text-muted-foreground hover:text-foreground hover:bg-muted",
								)}
							>
								<Languages size={16} aria-hidden="true" className="shrink-0" />
								{/* `lang` on the name itself, so a screen reader pronounces "Français" in French. */}
								<span lang={locale}>{LOCALE_NAMES[locale]}</span>
							</button>
						</li>
					))}
				</ul>
			</Card>
		</div>
	);
}
