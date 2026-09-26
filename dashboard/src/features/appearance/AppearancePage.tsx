import { type LucideIcon, Monitor, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguagePicker } from "@/components/form/LanguagePicker";
import { PageHeader, SegmentedControl } from "@/components/primitives";
import { AccentSwatch } from "@/features/appearance/components/AccentSwatch";
import { AppearanceCard } from "@/features/appearance/components/AppearanceCard";
import { ThemePreview } from "@/features/appearance/components/ThemePreview";
import { ACCENTS, useAccent, type Accent } from "@/hooks/useAccent";
import { useHashTarget } from "@/hooks/useHashTarget";
import { MOTIONS, useMotion, type Motion } from "@/hooks/useMotion";
import { usePageTitle } from "@/hooks/usePageTitle";
import { THEMES, useTheme, type Theme } from "@/hooks/useTheme";
import { type TranslationKey } from "@/i18n";

/** One row per theme: the icon, its name and what it does. A template-literal key would hide these from a search. */
const THEME_OPTIONS: Record<Theme, { icon: LucideIcon; label: TranslationKey; hint: TranslationKey }> = {
	system: { icon: Monitor, label: "appearance.system", hint: "appearance.systemHint" },
	light: { icon: Sun, label: "appearance.light", hint: "appearance.alwaysLight" },
	dark: { icon: Moon, label: "appearance.dark", hint: "appearance.alwaysDark" },
};

const ACCENT_LABELS: Record<Accent, TranslationKey> = {
	violet: "appearance.accentViolet",
	indigo: "appearance.accentIndigo",
	blue: "appearance.accentBlue",
	sky: "appearance.accentSky",
	cyan: "appearance.accentCyan",
	teal: "appearance.accentTeal",
	emerald: "appearance.accentEmerald",
	amber: "appearance.accentAmber",
	orange: "appearance.accentOrange",
	rose: "appearance.accentRose",
	pink: "appearance.accentPink",
	slate: "appearance.accentSlate",
};

const MOTION_OPTIONS: Record<Motion, { label: TranslationKey; hint: TranslationKey }> = {
	system: { label: "appearance.motionSystem", hint: "appearance.motionSystemHint" },
	full: { label: "appearance.motionFull", hint: "appearance.motionFullHint" },
	reduced: { label: "appearance.motionReduced", hint: "appearance.motionReducedHint" },
};

export function AppearancePage(): React.JSX.Element {
	const { t } = useTranslation();
	usePageTitle(t("appearance.title"));
	useHashTarget();
	const { theme, setTheme } = useTheme();
	const { accent, setAccent } = useAccent();
	const { motion, setMotion } = useMotion();

	return (
		<div className="flex flex-col gap-6">
			<PageHeader title={t("appearance.title")} subtitle={t("appearance.subtitle")} />

			<AppearanceCard id="theme" title={t("appearance.theme")} describes={t("appearance.themeDescribes")}>
				{/* A group of three sits at its content width; stretched across the card it reads as a tab bar. */}
				<div className="flex">
					<SegmentedControl
						label={t("appearance.theme")}
						value={theme}
						onChange={setTheme}
						segments={THEMES.map((name) => ({
							value: name,
							label: t(THEME_OPTIONS[name].label),
							hint: t(THEME_OPTIONS[name].hint),
						}))}
					/>
				</div>

				<div className="grid gap-3 sm:grid-cols-3">
					{THEMES.map((name) => (
						<ThemePreview
							key={name}
							theme={name}
							icon={THEME_OPTIONS[name].icon}
							label={t(THEME_OPTIONS[name].label)}
							selected={theme === name}
						/>
					))}
				</div>
			</AppearanceCard>

			<AppearanceCard id="accent" title={t("appearance.accent")} describes={t("appearance.accentDescribes")}>
				<ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
					{ACCENTS.map((name) => (
						<li key={name}>
							<AccentSwatch
								accent={name}
								label={t(ACCENT_LABELS[name])}
								selected={accent === name}
								onSelect={setAccent}
							/>
						</li>
					))}
				</ul>
			</AppearanceCard>

			<AppearanceCard id="motion" title={t("appearance.motion")} describes={t("appearance.motionDescribes")}>
				<div className="flex">
					<SegmentedControl
						label={t("appearance.motion")}
						value={motion}
						onChange={setMotion}
						segments={MOTIONS.map((name) => ({
							value: name,
							label: t(MOTION_OPTIONS[name].label),
							hint: t(MOTION_OPTIONS[name].hint),
						}))}
					/>
				</div>
			</AppearanceCard>

			<AppearanceCard id="language" title={t("appearance.language")} describes={t("appearance.languageDescribes")}>
				<LanguagePicker />
			</AppearanceCard>
		</div>
	);
}
