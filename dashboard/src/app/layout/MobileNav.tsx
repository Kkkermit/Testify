import { type BotIdentity, type DashboardUser } from "@testify/shared";
import { Menu, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Sidebar } from "@/app/layout/Sidebar";
import { BotMark } from "@/components/brand/BotMark";
import { type NavAudience } from "@/config/navigation";

/** A drawer below `md`, closing on Escape, on a link, and returning focus to its button. */
export function MobileNav({
	user,
	bot,
	guild,
	isOwner,
	open,
	onOpenChange,
}: NavAudience & {
	user: DashboardUser | null;
	bot?: BotIdentity | undefined;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}): React.JSX.Element {
	const { t } = useTranslation();
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
					<span className="sr-only">{t("nav.menu")}</span>
				</button>
				<BotMark src={bot?.avatarUrl} size={20} />
				<span className="font-display text-[0.9375rem] leading-tight font-bold tracking-tight">
					{bot?.username ?? "Testify"}
				</span>
			</header>

			{open && (
				<div className="fixed inset-0 z-40 md:hidden">
					{/* Not a control: Escape and the close button already cover the keyboard, and a second one is only noise in the tab order. */}
					<div aria-hidden="true" onClick={close} className="bg-background/70 motion-fade absolute inset-0" />
					<div id="mobile-nav" ref={panelRef} className="motion-fade absolute inset-y-0 left-0 overscroll-contain">
						<Sidebar user={user} bot={bot} guild={guild} isOwner={isOwner} expanded onNavigate={close} />
					</div>
					<button
						type="button"
						onClick={close}
						className="text-muted-foreground hover:text-foreground absolute top-4 right-4 p-2"
					>
						<X size={20} aria-hidden="true" />
						<span className="sr-only">{t("nav.closeMenu")}</span>
					</button>
				</div>
			)}
		</>
	);
}
