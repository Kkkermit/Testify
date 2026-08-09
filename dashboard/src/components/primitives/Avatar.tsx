import { cn } from "@/lib/cn";
import { tintFor } from "@/lib/tint";

/** A lettered tile in a colour derived from the name, because a missing picture is common and a broken image is the first thing anyone sees. */
export function Avatar({
	name,
	url,
	size = 40,
	seed,
}: {
	name: string;
	url: string | null;
	size?: number;
	/** Defaults to the name; pass the id where two servers may share one. */
	seed?: string;
}): React.JSX.Element {
	const style = { width: size, height: size };

	if (url === null) {
		return (
			<div
				className={cn(
					"flex shrink-0 items-center justify-center rounded-full font-semibold",
					size < 32 ? "text-xs" : "text-sm",
					tintFor(seed ?? name),
				)}
				style={style}
				aria-hidden="true"
			>
				{[...name][0]?.toUpperCase() ?? "?"}
			</div>
		);
	}

	return (
		<img src={url} alt="" width={size} height={size} className="shrink-0 rounded-full" style={style} loading="lazy" />
	);
}
