import { type ReactNode } from "react";

export function Summary({ children }: { children: ReactNode }): React.JSX.Element {
	return <p className="text-foreground max-w-prose text-base">{children}</p>;
}
