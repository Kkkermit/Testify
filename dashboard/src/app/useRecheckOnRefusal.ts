import { type QueryKey, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { isRefusal } from "@/lib/api";

/**
 * A refused request in scope, or any refused write, asks the access question again, so somebody who loses access
 * mid-session is ejected on their next request rather than left on a page of errors.
 */
export function useRecheckOnRefusal(inScope: (key: readonly unknown[]) => boolean, access: QueryKey): void {
	const client = useQueryClient();
	const scope = useRef(inScope);
	scope.current = inScope;
	const accessHash = JSON.stringify(access);

	useEffect(() => {
		const recheck = (): void =>
			void client.invalidateQueries({ queryKey: JSON.parse(accessHash) as QueryKey, exact: true });

		const queries = client.getQueryCache().subscribe((event) => {
			if (event.type !== "updated" || event.action.type !== "error" || !isRefusal(event.action.error)) return;
			if (event.query.queryHash !== accessHash && scope.current(event.query.queryKey as readonly unknown[])) recheck();
		});
		const mutations = client.getMutationCache().subscribe((event) => {
			if (event.type === "updated" && event.action.type === "error" && isRefusal(event.action.error)) recheck();
		});

		return () => {
			queries();
			mutations();
		};
	}, [client, accessHash]);
}
