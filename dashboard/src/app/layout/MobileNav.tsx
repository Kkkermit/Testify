import { type BotIdentity, type DashboardUser, type ManageableGuild } from "@testify/shared";
import { Menu, Search, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Sidebar } from "@/app/layout/Sidebar";
import { BotMark } from "@/components/brand/BotMark";
import { type NavAudience } from "@/config/navigation";
import { BUILT_IN_BOT_NAME } from "@/lib/brand";

/** A drawer below `md`, closing on Escape, on a link, and returning focus to its button. */
export function MobileNav({
	user,
	bot,
	guild,
	guilds,
	isOwner,
	open,
	onOpenChange,
	onSearch,
}: NavAudience & {
	user: DashboardUser | null;
	guilds: readonly ManageableGuild[];
	bot?: BotIdentity | undefined;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSearch: () => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const openerRef = useRef<HTMLButtonElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;

		panelRef.current?.querySelector("a")?.focus();

		// The page behind would otherwise take the swipe meant for the drawer.
		const scrolling = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		const onKeyDown = (event: KeyboardEvent): void => {
			if (event.key === "Escape") onOpenChange(false);
		};

		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("keydown", onKeyDown);
			document.body.style.overflow = scrolling;
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
					{bot?.name ?? BUILT_IN_BOT_NAME}
				</span>
				<button
					type="button"
					onClick={onSearch}
					className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-card ml-auto p-2 transition-colors duration-150"
				>
					<Search size={20} aria-hidden="true" />
					<span className="sr-only">{t("search.open")}</span>
				</button>
			</header>

			{open && (
				<div className="fixed inset-0 z-40 md:hidden">
					{/* Not a control: Escape and the close button already cover the keyboard, and a second one is only noise in the tab order. */}
					<div aria-hidden="true" onClick={close} className="bg-background/70 motion-fade absolute inset-0" />
					<div id="mobile-nav" ref={panelRef} className="motion-fade absolute inset-y-0 left-0 overscroll-contain">
						<Sidebar
							user={user}
							bot={bot}
							guild={guild}
							guilds={guilds}
							isOwner={isOwner}
							expanded
							onNavigate={close}
							onSearch={onSearch}
						/>
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
