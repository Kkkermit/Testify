import { ArrowLeft } from "lucide-react";
import { type ReactNode } from "react";
import { Link } from "react-router";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { cn } from "@/lib/cn";

/** The shell for the pages that render outside `AppShell` — the legal documents, and a 404 reached signed out. */
export function PublicPage({ children }: { children: ReactNode }): React.JSX.Element {
	return <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6">{children}</main>;
}

/** A way back for a page with no sidebar to leave from. */
export function BackLink({ to, children }: { to: string; children: ReactNode }): React.JSX.Element {
	return (
		<Link to={to} className={cn(INLINE_TARGET, "text-muted-foreground hover:text-foreground gap-2 self-start text-sm")}>
			<ArrowLeft size={15} aria-hidden="true" />
			{children}
		</Link>
	);
}
