import { type DashboardUser } from "@testify/shared";
import { Menu, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Sidebar } from "@/app/layout/Sidebar";
import { Logo } from "@/components/brand/Logo";
import { type NavAudience } from "@/config/navigation";

/**
 * Below `md` the rail would leave too little room for a settings form, so it becomes a drawer. Escape closes
 * it, focus moves into it on open and back to the button on close, and a click on any link inside closes it —
 * without that last one a phone stays covered by the menu after every navigation.
 */
export function MobileNav({
	user,
	guild,
	isOwner,
	open,
	onOpenChange,
}: NavAudience & {
	user: DashboardUser | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}): React.JSX.Element {
	const openerRef = useRef<HTMLButtonElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;

		panelRef.current?.querySelector("a")?.focus();

		const onKeyDown = (event: KeyboardEvent): void => {
			if (event.key === "Escape") onOpenChange(false);
		};

		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [open, onOpenChange]);

	function close(): void {
		onOpenChange(false);
		openerRef.current?.focus();
	}

	return (
		<>
			<header className="border-border bg-card/80 flex items-center gap-3 border-b p-3 backdrop-blur-sm md:hidden">
				<button
					ref={openerRef}
					type="button"
					aria-expanded={open}
					aria-controls="mobile-nav"
					onClick={() => {
						onOpenChange(!open);
					}}
					className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-card p-2 transition-colors duration-150"
				>
					<Menu size={20} aria-hidden="true" />
					<span className="sr-only">Menu</span>
				</button>
				<Logo size={20} className="text-accent" />
				<span className="font-semibold tracking-tight">Testify</span>
			</header>

			{open && (
				<div className="fixed inset-0 z-40 md:hidden">
					{/*
					 * Clicking away closes it, but the scrim is not a control: Escape and the button below already
					 * cover the keyboard, and a second "close" in the tab order is only noise to read past.
					 */}
					<div aria-hidden="true" onClick={close} className="bg-background/70 motion-fade absolute inset-0" />
					<div id="mobile-nav" ref={panelRef} className="motion-fade absolute inset-y-0 left-0">
						<Sidebar user={user} guild={guild} isOwner={isOwner} expanded onNavigate={close} />
					</div>
					<button
						type="button"
						onClick={close}
						className="text-muted-foreground hover:text-foreground absolute top-4 right-4 p-2"
					>
						<X size={20} aria-hidden="true" />
						<span className="sr-only">Close the menu</span>
					</button>
				</div>
			)}
		</>
	);
}
