import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";

/** No answer yet, no avatar set and an unreachable CDN all land on the built-in mark rather than a broken image icon. */
export function BotMark({
	src,
	size = 22,
	className,
}: {
	src: string | null | undefined;
	size?: number;
	className?: string;
}): React.JSX.Element {
	const [broken, setBroken] = useState(false);

	if (src === null || src === undefined || broken) {
		return <Logo size={size} className={cn("text-accent", className)} />;
	}

	return (
		<img
			src={src}
			alt=""
			width={size}
			height={size}
			loading="lazy"
			onError={() => {
				setBroken(true);
			}}
			className={cn("shrink-0 rounded-full", className)}
			style={{ width: size, height: size }}
		/>
	);
}
