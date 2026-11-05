import { type ReactNode } from "react";

/** What a screen's settings add up to right now, in one sentence, before any control. */
export function Summary({ children }: { children: ReactNode }): React.JSX.Element {
	return <p className="text-foreground max-w-prose text-base">{children}</p>;
}
