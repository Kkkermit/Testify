import { createContext, useContext } from "react";

/** True inside `SettingRows`, where a field puts its name on the left and its control on the right. */
export const RowLayout = createContext(false);

export function useRowLayout(): boolean {
	return useContext(RowLayout);
}

/** The two columns a row splits into from `md`: a fixed one for what the setting is, the rest for its control. */
export const ROW_GRID = "flex flex-col gap-2 md:grid md:grid-cols-[18rem_minmax(0,1fr)] md:items-start md:gap-6";

/** A row's name is the setting itself, so it reads at body size rather than as a caption above a box. */
export const ROW_LABEL = "text-foreground text-sm font-medium";
