import { createContext, useContext } from "react";

export const RowLayout = createContext(false);

export function useRowLayout(): boolean {
	return useContext(RowLayout);
}

export const ROW_GRID = "flex flex-col gap-2 md:grid md:grid-cols-[18rem_minmax(0,1fr)] md:items-start md:gap-6";

export const ROW_LABEL = "text-foreground text-sm font-medium";
