import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Later classes win, so a caller can override a component's default without fighting specificity. */
export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}
