import { useState } from "react";
import { cn } from "@/lib/cn";

/**
 * The application's profile banner, or a wash in its accent colour when it has none — which is most bots, so
 * the fallback is the common case rather than the exception.
 *
 * The accent is data from Discord, not a design token, so it is the one colour here that arrives as a value
 * rather than a class.
 */
export function BotBanner({
	src,
	accent,
	className,
}: {
	src: string | null | undefined;
	accent: string | null | undefined;
	className?: string;
}): React.JSX.Element {
	const [broken, setBroken] = useState(false);
	const showImage = src !== null && src !== undefined && !broken;

	return (
		<div
			aria-hidden="true"
			className={cn("from-primary/35 via-primary/10 to-card relative overflow-hidden bg-gradient-to-br", className)}
			style={accent === null || accent === undefined ? undefined : { backgroundColor: accent }}
		>
			{showImage && (
				<img
					src={src}
					alt=""
					loading="lazy"
					onError={() => {
						setBroken(true);
					}}
					className="h-full w-full object-cover"
				/>
			)}
			{/* Keeps the mark and any text above it legible whatever the banner turns out to be. */}
			<div className="from-card absolute inset-0 bg-gradient-to-t to-transparent" />
		</div>
	);
}
