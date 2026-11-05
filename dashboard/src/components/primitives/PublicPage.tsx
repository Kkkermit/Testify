import { ArrowLeft } from "lucide-react";
import { type MouseEventHandler, type ReactNode } from "react";
import { Link } from "react-router";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { cn } from "@/lib/cn";

export function PublicPage({ children }: { children: ReactNode }): React.JSX.Element {
	return <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6">{children}</main>;
}

export function BackLink({
	to,
	onClick,
	children,
}: {
	to: string;
	onClick?: MouseEventHandler<HTMLAnchorElement>;
	children: ReactNode;
}): React.JSX.Element {
	return (
		<Link
			to={to}
			onClick={onClick}
			className={cn(INLINE_TARGET, "text-muted-foreground hover:text-foreground gap-2 self-start text-sm")}
		>
			<ArrowLeft size={15} aria-hidden="true" />
			{children}
		</Link>
	);
}
