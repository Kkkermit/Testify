import { type BotFeature, NONE_OFF, switchedOff } from "@testify/shared";
import { useMemo } from "react";
import { useSite } from "@/features/site/useSite";

/** What `DISABLED_FEATURES` switched off on this bot; nothing until the site's answer arrives, or if it never does. */
export function useFeaturesOff(): ReadonlySet<BotFeature> {
	const { data } = useSite();
	return useMemo(() => (data === undefined ? NONE_OFF : switchedOff(data.featuresOff).off), [data]);
}

/** Whether `feature` is on: undefined while the site's answer is on its way, and on if it never arrives. */
export function useFeatureOn(feature: BotFeature): boolean | undefined {
	const off = useFeaturesOff();
	const { isPending } = useSite();
	return isPending ? undefined : !off.has(feature);
}
