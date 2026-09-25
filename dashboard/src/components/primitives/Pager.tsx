import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/primitives/Button";
import { cn } from "@/lib/cn";
import { pageWindow } from "@/lib/paging";

const STEP = "min-w-11 px-3";
const NUMBER = "min-w-11 px-0 tabular-nums";

/** `label` names the list being paged, which a screen needs when it holds more than one pager. */
export function Pager({
	page,
	pages,
	onChange,
	label,
}: {
	page: number;
	pages: number;
	onChange: (page: number) => void;
	label?: string;
}): React.JSX.Element | null {
	const { t } = useTranslation();
	if (pages <= 1) return null;

	const atStart = page <= 1;
	const atEnd = page >= pages;

	function step(
		target: number,
		text: string,
		icon: React.JSX.Element,
		disabled: boolean,
		forward = false,
	): React.JSX.Element {
		return (
			<Button
				variant="secondary"
				className={STEP}
				disabled={disabled}
				onClick={() => {
					onChange(target);
				}}
			>
				{!forward && icon}
				{/* On a phone the numbers need the row, so the steps keep their names for a screen reader only. */}
				<span className="sr-only sm:not-sr-only">{text}</span>
				{forward && icon}
			</Button>
		);
	}

	return (
		<nav aria-label={label ?? t("common.pages")} className="flex flex-col gap-2">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex gap-2">
					{step(1, t("common.first"), <ChevronsLeft size={16} aria-hidden="true" />, atStart)}
					{step(page - 1, t("common.previous"), <ChevronLeft size={16} aria-hidden="true" />, atStart)}
				</div>

				<ol className="order-first flex w-full justify-center gap-1 sm:order-none sm:w-auto">
					{pageWindow(page, pages).map((number) => (
						<li key={number}>
							{number === page ? (
								<span
									aria-current="page"
									className={cn(
										"bg-primary text-primary-foreground rounded-card inline-flex min-h-11 items-center justify-center text-sm font-medium",
										NUMBER,
									)}
								>
									<span className="sr-only">{t("common.pageNumber", { page: number })}</span>
									<span aria-hidden="true">{number}</span>
								</span>
							) : (
								<Button
									variant="ghost"
									className={NUMBER}
									aria-label={t("common.pageNumber", { page: number })}
									onClick={() => {
										onChange(number);
									}}
								>
									{number}
								</Button>
							)}
						</li>
					))}
				</ol>

				<div className="flex gap-2">
					{step(page + 1, t("common.next"), <ChevronRight size={16} aria-hidden="true" />, atEnd, true)}
					{step(pages, t("common.last"), <ChevronsRight size={16} aria-hidden="true" />, atEnd, true)}
				</div>
			</div>

			<p className="text-muted-foreground text-center text-sm tabular-nums" aria-live="polite">
				{t("common.pageOf", { page, pages })}
			</p>
		</nav>
	);
}
