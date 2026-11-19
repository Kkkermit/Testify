import { type UseQueryResult } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { ErrorState } from "@/app/ErrorState";
import { Skeleton } from "@/components/primitives";
import { AnalyticsUnavailable, type ProblemWords } from "@/features/owner/components/AnalyticsNotice";
import { analyticsProblemOf } from "@/features/owner/owner.utils";

/** A read from Shardlens, with its loading and its failure said the same way on every part of the console. */
export function AnalyticsState<T>({
	query,
	children,
	why,
}: {
	query: UseQueryResult<T>;
	children: (data: T) => ReactNode;
	why?: ProblemWords;
}): React.JSX.Element {
	if (query.isError) {
		const problem = analyticsProblemOf(query.error);
		const retry = (): void => void query.refetch();
		return problem === null ? (
			<ErrorState as="h2" error={query.error} onRetry={retry} />
		) : (
			<AnalyticsUnavailable problem={problem} onRetry={retry} {...(why === undefined ? {} : { why })} />
		);
	}
	if (query.data === undefined) return <Skeleton className="h-96 w-full" />;

	return <>{children(query.data)}</>;
}
