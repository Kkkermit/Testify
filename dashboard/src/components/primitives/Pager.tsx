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
	if (pages <= 1) return null;

	return (
		<nav aria-label="Pages" className="flex items-center justify-between">
			<Button
				variant="secondary"
				disabled={page <= 1}
				onClick={() => {
					onChange(page - 1);
				}}
			>
				Previous
			</Button>
			<span className="text-muted-foreground text-sm tabular-nums" aria-live="polite">
				Page {page} of {pages}
			</span>
			<Button
				variant="secondary"
				disabled={page >= pages}
				onClick={() => {
					onChange(page + 1);
				}}
			>
				Next
			</Button>
		</nav>
	);
}
