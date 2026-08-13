import { applyPreference, type Preference, storedPreference } from "@/hooks/rootPreference";
import { ACCENT } from "@/hooks/useAccent";
import { MOTION } from "@/hooks/useMotion";
import { THEME } from "@/hooks/useTheme";

const PREFERENCES: readonly Preference<string>[] = [THEME, ACCENT, MOTION];

/**
 * Called once before the app mounts, because the appearance page is the only screen holding these hooks and a
 * reader who lands anywhere else would otherwise get the defaults until they visited it.
 */
export function applyStoredPreferences(): void {
	for (const spec of PREFERENCES) applyPreference(spec, storedPreference(spec));
}
