import { useTranslation } from "react-i18next";
import { Button } from "@/components/primitives";

export function Pager({
	page,
	pages,
	onChange,
}: {
	page: number;
	pages: number;
	onChange: (page: number) => void;
}): React.JSX.Element | null {
	const { t } = useTranslation();
	if (pages <= 1) return null;

	return (
		<nav aria-label={t("common.pages")} className="flex items-center justify-between">
			<Button
				variant="secondary"
				disabled={page <= 1}
				onClick={() => {
					onChange(page - 1);
				}}
			>
				{t("common.previous")}
			</Button>
			<span className="text-muted-foreground text-sm tabular-nums" aria-live="polite">
				{t("common.pageOf", { page, pages })}
			</span>
			<Button
				variant="secondary"
				disabled={page >= pages}
				onClick={() => {
					onChange(page + 1);
				}}
			>
				{t("common.next")}
			</Button>
		</nav>
	);
}
