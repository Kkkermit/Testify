import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SELECT } from "@/components/form/fieldStyles";
import { isLocale, type Locale, LOCALE_NAMES, LOCALES } from "@/i18n";
import { cn } from "@/lib/cn";

export function LanguageSelect({ className }: { className?: string }): React.JSX.Element {
	const { t, i18n } = useTranslation();
	const active: Locale = isLocale(i18n.resolvedLanguage) ? i18n.resolvedLanguage : "en";

	return (
		<label className={cn("relative inline-flex items-center", className)}>
			<span className="sr-only">{t("appearance.language")}</span>
			<Languages size={15} aria-hidden="true" className="text-muted-foreground pointer-events-none absolute left-3" />
			<select
				value={active}
				onChange={(event) => {
					if (isLocale(event.target.value)) void i18n.changeLanguage(event.target.value);
				}}
				className={cn(SELECT, "min-h-10 w-auto pl-9")}
			>
				{LOCALES.map((locale) => (
					<option key={locale} value={locale} lang={locale}>
						{LOCALE_NAMES[locale]}
					</option>
				))}
			</select>
		</label>
	);
}
