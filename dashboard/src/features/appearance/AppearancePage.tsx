import { Monitor, Moon, Sun } from "lucide-react";
import { Card, PageHeader, SegmentedControl } from "@/components/primitives";
import { CARD_HEADING } from "@/components/primitives/textStyles";
import { ThemePreview } from "@/features/appearance/components/ThemePreview";
import { usePageTitle } from "@/hooks/usePageTitle";
import { THEMES, useTheme, type Theme } from "@/hooks/useTheme";

const THEME_ICON: Record<Theme, typeof Sun> = { system: Monitor, light: Sun, dark: Moon };

export function AppearancePage(): React.JSX.Element {
	usePageTitle("Appearance");
	const { theme, setTheme } = useTheme();

	return (
		<div className="flex flex-col gap-6">
			<PageHeader title="Appearance" subtitle="How this dashboard looks in your browser. Nobody else is affected." />

			<Card className="flex flex-col gap-4">
				<div>
					<h2 className={CARD_HEADING}>Theme</h2>
					<p className="text-muted-foreground text-sm">
						Follow the system and it changes when your device does, at sunset or on a schedule you already set.
					</p>
				</div>

				{/* A group of three sits at its content width; stretched across the card it reads as a tab bar. */}
				<div className="flex">
					<SegmentedControl
						label="Theme"
						value={theme}
						onChange={setTheme}
						segments={THEMES.map((name) => ({
							value: name,
							label: name === "system" ? "System" : name === "light" ? "Light" : "Dark",
							hint:
								name === "system"
									? "Match whatever this device is set to"
									: `Always ${name}, whatever the device is set to`,
						}))}
					/>
				</div>

				<div className="grid gap-3 sm:grid-cols-3">
					{THEMES.map((name) => (
						<ThemePreview key={name} theme={name} icon={THEME_ICON[name]} selected={theme === name} />
					))}
				</div>
			</Card>
		</div>
	);
}
