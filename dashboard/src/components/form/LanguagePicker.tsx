import { useTranslation } from "react-i18next";
import { FlagIcon } from "@/components/brand/FlagIcon";
import { isLocale, type Locale, LOCALE_NAMES, LOCALES } from "@/i18n";
import { cn } from "@/lib/cn";

/** The flag says which language at a glance; the endonym is what names the control. */
export function LanguagePicker({ className }: { className?: string }): React.JSX.Element {
	const { t, i18n } = useTranslation();
	const active: Locale = isLocale(i18n.resolvedLanguage) ? i18n.resolvedLanguage : "en";

	return (
		<ul className={cn("grid gap-2 sm:grid-cols-2", className)} aria-label={t("appearance.language")}>
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
						<FlagIcon locale={locale} />
						{/* `lang` on the name itself, so a screen reader pronounces "Français" in French. */}
						<span lang={locale}>{LOCALE_NAMES[locale]}</span>
					</button>
				</li>
			))}
		</ul>
	);
}
