import { useEffect, useId, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useBlocker } from "react-router";
import { Button } from "@/components/primitives";

/** Asks before leaving a screen whose draft is not saved; a reload or a closed tab gets the browser's own question. */
export function LeaveGuard({ when }: { when: boolean }): React.JSX.Element | null {
	const { t } = useTranslation();
	const titleId = useId();
	const bodyId = useId();
	const stay = useRef<HTMLButtonElement>(null);
	const opener = useRef<HTMLElement | null>(null);
	// A tab or a filter on the same screen is not leaving it.
	const blocker = useBlocker(
		({ currentLocation, nextLocation }) => when && currentLocation.pathname !== nextLocation.pathname,
	);
	const blocked = blocker.state === "blocked";

	useEffect(() => {
		if (!when) return;
		const onBeforeUnload = (event: BeforeUnloadEvent): void => {
			event.preventDefault();
		};

		window.addEventListener("beforeunload", onBeforeUnload);
		return () => {
			window.removeEventListener("beforeunload", onBeforeUnload);
		};
	}, [when]);

	useEffect(() => {
		if (!blocked) return;
		opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		stay.current?.focus();
	}, [blocked]);

	if (!blocked) return null;

	function keepEditing(): void {
		blocker.reset?.();
		opener.current?.focus();
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div aria-hidden="true" onClick={keepEditing} className="bg-background/70 motion-fade absolute inset-0" />
			<div
				role="alertdialog"
				aria-modal="true"
				aria-labelledby={titleId}
				aria-describedby={bodyId}
				onKeyDown={(event) => {
					if (event.key === "Escape") {
						event.preventDefault();
						keepEditing();
					} else if (event.key === "Tab") {
						// Two buttons and nothing else, so Tab moves between them rather than off into the page.
						const buttons = [...event.currentTarget.querySelectorAll("button")];
						const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
						event.preventDefault();
						buttons[(at + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();
					}
				}}
				className="bg-popover border-border rounded-card motion-pop relative flex w-full max-w-sm flex-col gap-4 border p-6 shadow-lg"
			>
				<h2 id={titleId} className="font-semibold">
					{t("leave.title")}
				</h2>
				<p id={bodyId} className="text-muted-foreground text-sm">
					{t("leave.body")}
				</p>
				<div className="flex flex-wrap justify-end gap-2">
					<Button
						variant="destructive"
						onClick={() => {
							blocker.proceed();
						}}
					>
						{t("leave.leave")}
					</Button>
					<Button ref={stay} variant="secondary" onClick={keepEditing}>
						{t("leave.stay")}
					</Button>
				</div>
			</div>
		</div>
	);
}
