const { exec } = require("child_process");
const readline = require("readline");
const { color, getTimestamp } = require("../utils/loggingEffects");
const { asciiTextCommitRunner } = require("../lib/asciiText");

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

const askQuestion = (question) => {
	return new Promise((resolve) => rl.question(question, resolve));
};

asciiTextCommitRunner();

const gitLog = `${color.pink}[${getTimestamp()}]${color.reset} ${color.orange}[GIT]${color.reset}`;
const gitLogError = `${color.pink}[${getTimestamp()}]${color.reset} ${color.red}[GIT_ERROR]${color.reset}`;
const gitLogDescription = `${color.darkGrey}`;

const commit = async () => {
	const types = [
		{ type: "feat", description: "A new feature" },
		{ type: "fix", description: "A bug fix" },
		{ type: "docs", description: "Documentation changes" },
		{ type: "style", description: "Code style changes (formatting, etc)" },
		{ type: "refactor", description: "Code refactoring with no feature changes" },
		{ type: "perf", description: "Performance improvements" },
		{ type: "test", description: "Adding or updating tests" },
		{ type: "chore", description: "Maintenance tasks, dependency updates, etc" },
		{ type: "add", description: "Adding new features or files" },
		{ type: "update", description: "Updating existing features or files" },
		{ type: "remove", description: "Removing features or files" }
	];

	let selectedType;
	while (!selectedType) {
		console.log(`${gitLog} ${color.green}\x1b[1mSelect the type of change\x1b[0m:${color.reset}`);
		types.forEach((item, index) => {
			console.log(
				`${gitLog} ${color.green}[${index + 1}]. \x1b[4m${item.type}\x1b[0m${color.reset} - ${gitLogDescription}*${
					item.description
				}*${color.reset}`,
			);
		});

		const typeIndex = await askQuestion(`${gitLog} Enter the number corresponding to the type of change: `);
		selectedType = types[parseInt(typeIndex) - 1];

		if (!selectedType) {
			console.error(
				`${gitLogError} ${color.red}Invalid selection. Please choose a valid type for your change.${color.reset}`,
			);
		}
	}

	let message = await askQuestion(`${gitLog} Enter the commit message: `);
	message = message.charAt(0).toUpperCase() + message.slice(1);

	const confirmation = await askQuestion(
		`${gitLog} Are you \x1b[1msure\x1b[0m you want to commit with message ${color.green}"\x1b[4m${selectedType.type}: ${message}\x1b[0m${color.green}"${color.reset}? (${color.green}YES${color.reset}/${color.torquise}no${color.reset}, default is ${color.green}YES${color.reset}): `,
	);

	if (confirmation.toLowerCase() === "no") {
		console.log(`${gitLogError} ${color.red}Commit aborted.${color.reset}`);
		process.exit(0);
	} else {
		console.log(
			`${gitLog} Committing with message ${color.green}"\x1b[4m\x1b[1m${selectedType.type}: ${message}\x1b[0m\x1b[0m${color.green}"${color.reset}...`,
		);
		exec(`git commit -m "${selectedType.type}: ${message}"`, (error, stdout, stderr) => {
			if (error) {
				console.error(
					`${gitLogError} ${color.red}Error: ${error.message} \n${gitLogError}${color.red} One reason for this could be because your files aren't being tracked. To add in your file, please use "git add <file>" or "git add ."${color.reset}`,
				);
				return;
			}
			if (stderr) {
				console.error(`${gitLogError} ${color.red}Stderr: ${stderr}${color.reset}`);
				return;
			}
			console.log(`${gitLog} ${color.green}Stdout:${color.reset} \n ${color.blue}${stdout}${color.reset}`);
		});
	}

	rl.close();
};

commit();
