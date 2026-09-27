import { AlertTriangle } from "lucide-react";
import { type ReactNode } from "react";

export function Warning({ children }: { children: ReactNode }): React.JSX.Element {
	return (
		<span className="text-warning motion-fade mt-2 flex items-start gap-2 text-xs" role="status">
			<AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
			<span>{children}</span>
		</span>
	);
}
