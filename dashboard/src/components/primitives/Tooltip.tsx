import { cloneElement, useEffect, useRef, type ReactElement, type Ref } from "react";
import tippy, { type Instance, type Placement } from "tippy.js";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import "tippy.js/dist/tippy.css";

/**
 * Every tooltip in the dashboard goes through here, so the theme, the delay and the accessibility contract are
 * set once rather than per call site.
 *
 * A tooltip **describes**; it never names. Anything it says has to be an addition to a control that already has
 * an accessible name of its own, because a pointer-only affordance is invisible to anyone who reaches the
 * control another way.
 *
 * It drives tippy.js directly rather than through `@tippyjs/react`, which reads `element.ref` — a property
 * React 19 removed.
 */
export function Tooltip({
	label,
	placement = "top",
	children,
}: {
	label: string;
	placement?: Placement;
	children: ReactElement<{ ref?: Ref<HTMLElement> }>;
}): React.JSX.Element {
	const anchorRef = useRef<HTMLElement>(null);
	const reduced = usePrefersReducedMotion();

	useEffect(() => {
		const anchor = anchorRef.current;
		if (anchor === null) return;

		const instance: Instance = tippy(anchor, {
			content: label,
			theme: "testify",
			placement,
			// Long enough not to fire while the pointer crosses a row of icons on its way somewhere else.
			delay: [350, 0],
			duration: reduced ? 0 : 120,
			// `focusin` is what carries focus through to the anchor, so a keyboard reaches this too.
			trigger: "mouseenter focusin",
			aria: { content: "describedby", expanded: false },
			appendTo: () => document.body,
		});

		return () => {
			instance.destroy();
		};
	}, [label, placement, reduced]);

	return cloneElement(children, { ref: anchorRef });
}
