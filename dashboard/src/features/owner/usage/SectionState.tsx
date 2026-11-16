import { type UseQueryResult } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { ErrorState } from "@/app/ErrorState";
import { Skeleton } from "@/components/primitives";
import { AnalyticsUnavailable } from "@/features/owner/components/AnalyticsNotice";
import { analyticsProblemOf } from "@/features/owner/owner.utils";

/** A section's loading and failure, said the same way in each; a section that failed leaves the rest working. */
export function SectionState<T>({
	query,
	children,
}: {
	query: UseQueryResult<T>;
	children: (data: T) => ReactNode;
}): React.JSX.Element {
	if (query.isError) {
		const problem = analyticsProblemOf(query.error);
		const retry = (): void => void query.refetch();
		return problem === null ? (
			<ErrorState as="h2" error={query.error} onRetry={retry} />
		) : (
			<AnalyticsUnavailable problem={problem} onRetry={retry} />
		);
	}
	if (query.data === undefined) return <Skeleton className="h-96 w-full" />;

	return <>{children(query.data)}</>;
}
