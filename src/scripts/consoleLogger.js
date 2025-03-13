const fetch = require("node-fetch");
const { color, getTimestamp } = require("../utils/loggingEffects");
const fs = require("fs");
const path = require("path");
const util = require("util");

class ConsoleLogger {
	constructor(webhookUrl) {
		this.webhookUrl = webhookUrl || process.env.LOG_WEBHOOK_URL;
		this.logBuffer = [];
		this.bufferSize = 25; 
		this.flushInterval = 10000; 
		this.maxMessageLength = 1950; 
		this.logFilePath = path.join(__dirname, "../../logs/console.log");
		this.isSetup = false;
		this.lastSentTimestamp = Date.now();
		this.rateLimit = {
			remaining: 5,
			reset: Date.now(),
			queue: [],
			processing: false,
			backoff: 1000,
			lastErrorLog: 0,
		};
		this.messageHash = new Set();
		this.cleanupInterval = setInterval(() => this.cleanupMessageHash(), 300000);

		const logDir = path.dirname(this.logFilePath);
		if (!fs.existsSync(logDir)) {
			fs.mkdirSync(logDir, { recursive: true });
		}

		this.stdout = process.stdout.write;
		this.stderr = process.stderr.write;
	}

	setup() {
		if (this.isSetup) return;

		if (!this.webhookUrl) {
			console.warn(
				`${
					color.yellow
				}[${getTimestamp()}] [CONSOLE_LOGGER] No webhook URL provided. Console logging to Discord disabled.${
					color.reset
				}`,
			);
			return;
		}

		const originalConsoleLog = console.log;
		const originalConsoleError = console.error;
		const originalConsoleWarn = console.warn;
		const originalConsoleInfo = console.info;
		const self = this;

		process.stdout.write = function (chunk, encoding, callback) {
			self.stdout.apply(process.stdout, arguments);
			self.captureLog(chunk.toString(), "info");
			return true;
		};

		process.stderr.write = function (chunk, encoding, callback) {
			self.stderr.apply(process.stderr, arguments);
			self.captureLog(chunk.toString(), "error");
			return true;
		};

		console.log = function () {
			originalConsoleLog.apply(console, arguments);
			const message = util.format.apply(null, arguments);
			self.captureLog(message, "log");
		};

		console.error = function () {
			originalConsoleError.apply(console, arguments);
			const message = util.format.apply(null, arguments);
			self.captureLog(message, "error");
		};

		console.warn = function () {
			originalConsoleWarn.apply(console, arguments);
			const message = util.format.apply(null, arguments);
			self.captureLog(message, "warn");
		};

		console.info = function () {
			originalConsoleInfo.apply(console, arguments);
			const message = util.format.apply(null, arguments);
			self.captureLog(message, "info");
		};

		this.flushIntervalId = setInterval(() => this.flushBuffer(), this.flushInterval);

		this.queueProcessorId = setInterval(() => this.processQueue(), 2000);

		process.on("exit", () => {
			clearInterval(this.flushIntervalId);
			clearInterval(this.queueProcessorId);
			this.flushBuffer(true);
		});

		process.on("SIGINT", () => {
			this.captureLog("Bot process terminated by SIGINT signal", "warn");
			this.flushBuffer(true);
			process.exit();
		});

		this.isSetup = true;
		this.captureLog(
			`${
				color.green
			}[${getTimestamp()}] [CONSOLE_LOGGER] Console logger initialized. Logs will be sent to Discord webhook.${
				color.reset
			}`,
			"info",
		);
	}

	generateMessageHash(message, timestamp) {
		return `${message.trim()}${Math.floor(timestamp / 1000)}`;
	}

	cleanupMessageHash() {
		this.messageHash.clear();
	}

	captureLog(message, level = "info") {
		message = message.replace(/\u001b\[\d+m/g, "");

		const timestamp = Date.now();
		const hash = this.generateMessageHash(message, timestamp);

		if (this.messageHash.has(hash)) return;
		this.messageHash.add(hash);

		try {
			fs.appendFileSync(
				this.logFilePath,
				`[${new Date(timestamp).toISOString()}] [${level.toUpperCase()}] ${message}\n`,
			);
		} catch (err) {
			process.stderr.write(`Failed to write to log file: ${err}\n`);
		}

		this.logBuffer.push({ message, level, timestamp });

		if (this.logBuffer.length >= this.bufferSize || level === "error" || timestamp - this.lastSentTimestamp > 10000) {
			this.flushBuffer();
		}
	}

	async flushBuffer(immediate = false) {
		if (this.logBuffer.length === 0) return;

		const buffer = [...this.logBuffer];
		this.logBuffer = [];
		this.lastSentTimestamp = Date.now();

		const messages = this.groupLogs(buffer);

		messages.forEach((content) => {
			this.rateLimit.queue.push({ content, immediate });
		});

		if (!this.rateLimit.processing && Date.now() >= this.rateLimit.reset) {
			this.processQueue();
		}
	}

	async processQueue() {
		if (this.rateLimit.processing || this.rateLimit.queue.length === 0) return;
		if (Date.now() < this.rateLimit.reset) return;

		this.rateLimit.processing = true;

		try {
			const item = this.rateLimit.queue.shift();
			await this.sendToDiscord(item.content, item.immediate);
			await new Promise((resolve) => setTimeout(resolve, this.rateLimit.backoff));
		} finally {
			this.rateLimit.processing = false;
		}
	}

	groupLogs(logs) {
		const messages = [];
		let currentMessage = "";

		logs.sort((a, b) => a.timestamp - b.timestamp);

		const seen = new Set();

		for (const log of logs) {
			const logEntry = `[${new Date(log.timestamp).toISOString()}] [${log.level.toUpperCase()}] ${log.message}\n`;

			const hash = this.generateMessageHash(logEntry, log.timestamp);
			if (seen.has(hash)) continue;
			seen.add(hash);

			if (currentMessage.length + logEntry.length > this.maxMessageLength) {
				messages.push(currentMessage.trim());
				currentMessage = logEntry;
			} else {
				currentMessage += logEntry;
			}
		}

		if (currentMessage.length > 0) {
			messages.push(currentMessage.trim());
		}

		return messages;
	}

	async sendToDiscord(content, immediate = false) {
		if (!this.webhookUrl) return;

		content = content
			.replace(/\u001b\[\d+m/g, "")
			.replace(/\n\s*\n/g, "\n")
			.trim();

		const payload = {
			username: "Testify Console Logger",
			avatar_url: "https://i.postimg.cc/KznLsF43/Testi-1.png",
			content: "```\n" + content + "\n```",
		};

		try {
			await new Promise((resolve) => setTimeout(resolve, this.rateLimit.backoff));

			const response = await fetch(this.webhookUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				if (response.status === 429) {
					const data = await response.json();
					const retryAfter = (data.retry_after || 1) * 1000;

					this.rateLimit.reset = Date.now() + retryAfter + 100;
					this.rateLimit.backoff = Math.min(this.rateLimit.backoff * 2, 30000);
					this.rateLimit.queue.push({ content, immediate });

					if (immediate) {
						await new Promise((resolve) => setTimeout(resolve, retryAfter));
						await this.sendToDiscord(content, true);
					}
				} else {
					throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
				}
			} else {
				this.rateLimit.backoff = 1000;
				const remaining = parseInt(response.headers.get("X-RateLimit-Remaining") || "5");
				const resetAfter = parseInt(response.headers.get("X-RateLimit-Reset-After") || "1");

				if (remaining <= 1) {
					this.rateLimit.reset = Date.now() + resetAfter * 1000 + 100;
				}
			}
		} catch (error) {
			const now = Date.now();
			if (now - this.rateLimit.lastErrorLog > 60000) {
				this.stdout.call(
					process.stdout,
					`${color.red}[${getTimestamp()}] [CONSOLE_LOGGER] Error sending logs: ${error.message}${color.reset}\n`,
				);
				this.rateLimit.lastErrorLog = now;
			}

			this.rateLimit.backoff = Math.min(this.rateLimit.backoff * 2, 60000);

			if (immediate || content.includes("ERROR] ") || content.includes("WARN] ")) {
				this.rateLimit.queue.push({ content, immediate });
			}
		}
	}
}

const consoleLogger = new ConsoleLogger();

module.exports = {
	setup: (webhookUrl) => {
		if (webhookUrl) consoleLogger.webhookUrl = webhookUrl;
		consoleLogger.setup();
	},
	logger: consoleLogger,
	flushLogs: (immediate = true) => consoleLogger.flushBuffer(immediate),
};

if (require.main === module) {
	consoleLogger.setup();
	console.log("Console logger started. All console output will be sent to the Discord webhook.");
}
