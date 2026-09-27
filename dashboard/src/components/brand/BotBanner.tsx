import { useState } from "react";
import { cn } from "@/lib/cn";

/** The profile banner, or a wash in the accent colour Discord returns — the one colour here written as a value rather than a token. */
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
