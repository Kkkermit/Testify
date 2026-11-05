import { applyPreference, type Preference, storedPreference } from "@/hooks/rootPreference";
import { ACCENT, applyCustomColour, storedAccent, storedCustomColour } from "@/hooks/useAccent";
import { MOTION } from "@/hooks/useMotion";
import { THEME } from "@/hooks/useTheme";

const PREFERENCES: readonly Preference<string>[] = [THEME, MOTION];

/** Called once before the app mounts, so a stored choice applies on whichever screen a reader lands. */
export function applyStoredPreferences(): void {
	for (const spec of PREFERENCES) applyPreference(spec, storedPreference(spec));
	applyCustomColour(storedCustomColour());
	applyPreference(ACCENT, storedAccent());
}
