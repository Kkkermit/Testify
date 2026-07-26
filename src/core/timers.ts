import { toError } from "./errors";
import { type Logger } from "./logger";

/**
 * Every recurring or delayed task registers here so shutdown can clear it. The
 * previous code ran six intervals that were never cleared, one of which used
 * self-rescheduling `setTimeout` recursion that could not be cancelled at all.
 */
export class TimerRegistry {
	private readonly handles = new Map<string, NodeJS.Timeout>();
	private readonly running = new Set<string>();

	constructor(private readonly logger: Logger) {}

	interval(name: string, ms: number, fn: () => Promise<void> | void): void {
		this.clear(name);
		this.handles.set(
			name,
			setInterval(() => void this.run(name, fn), ms),
		);
	}

	/** Like `interval`, but skips a tick while the previous run is still in flight. */
	guardedInterval(name: string, ms: number, fn: () => Promise<void> | void): void {
		this.clear(name);
		this.handles.set(
			name,
			setInterval(() => {
				if (this.running.has(name)) {
					this.logger.warn({ timer: name }, "Skipping tick, previous run still in flight");
					return;
				}
				this.running.add(name);
				void this.run(name, fn).finally(() => this.running.delete(name));
			}, ms),
		);
	}

	timeout(name: string, ms: number, fn: () => Promise<void> | void): void {
		this.clear(name);
		this.handles.set(
			name,
			setTimeout(() => {
				this.handles.delete(name);
				void this.run(name, fn);
			}, ms),
		);
	}

	private async run(name: string, fn: () => Promise<void> | void): Promise<void> {
		try {
			await fn();
		} catch (error) {
			this.logger.error({ timer: name, err: toError(error) }, "Scheduled task failed");
		}
	}

	has(name: string): boolean {
		return this.handles.has(name);
	}

	clear(name: string): void {
		const handle = this.handles.get(name);
		if (handle === undefined) return;
		clearTimeout(handle);
		clearInterval(handle);
		this.handles.delete(name);
	}

	clearAll(): void {
		for (const name of [...this.handles.keys()]) this.clear(name);
	}

	get size(): number {
		return this.handles.size;
	}

	names(): string[] {
		return [...this.handles.keys()];
	}
}
