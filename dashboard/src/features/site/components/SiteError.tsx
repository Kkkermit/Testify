import { useTranslation } from "react-i18next";
import { Button, Card } from "@/components/primitives";

/** A public page's failure: what went wrong and a retry, with no way back to a dashboard this host may not have. */
export function SiteError({
	title,
	body,
	onRetry,
	as: Heading = "h2",
}: {
	title: string;
	body: string;
	onRetry?: () => void;
	as?: "h1" | "h2";
}): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<Card className="flex flex-col items-start gap-3" role="status">
			<Heading className="text-lg font-semibold">{title}</Heading>
			<p className="text-muted-foreground text-sm">{body}</p>
			{onRetry !== undefined && (
				<Button variant="secondary" onClick={onRetry}>
					{t("common.retry")}
				</Button>
			)}
		</Card>
	);
}
