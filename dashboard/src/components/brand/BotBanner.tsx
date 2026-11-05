import { useState } from "react";
import { cn } from "@/lib/cn";

/** Discord's accent colour arrives as a value, the one colour here not from a token. */
export function BotBanner({
	src,
	accent,
	className,
}: {
	src: string | null | undefined;
	accent: string | null | undefined;
	className?: string;
}): React.JSX.Element {
	const [broken, setBroken] = useState<string | null>(null);
	const showImage = src !== null && src !== undefined && broken !== src;

	return (
		<div
			aria-hidden="true"
			className={cn("bg-accent-wash relative overflow-hidden", className)}
			style={accent === null || accent === undefined ? undefined : { backgroundColor: accent }}
		>
			{showImage && (
				<img
					src={src}
					alt=""
					onError={() => {
						setBroken(src);
					}}
					className="h-full w-full object-cover"
				/>
			)}
		</div>
	);
}
