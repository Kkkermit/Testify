import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";

/**
 * The bot's own avatar wherever the product identifies itself, falling back to the built-in mark.
 *
 * Three things can go wrong and all three land on the same fallback: the API has not answered yet, the bot is
 * still connecting, or Discord's CDN is unreachable. A brand mark is never worth a broken image icon.
 */
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
