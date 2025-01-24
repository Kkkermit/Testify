const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
const { color, getTimestamp } = require("../utils/loggingEffects");

async function updatePackages() {
	try {
		console.log(`${color.pink}[${getTimestamp()}]${color.reset} [PACKAGE_UPDATER] Checking for outdated packages...`);
		const { stdout } = await execPromise("npm outdated --json").catch((error) => {
			if (error.stdout) {
				return { stdout: error.stdout };
			}
			throw error;
		});

		if (!stdout) {
			console.log(`${color.pink}[${getTimestamp()}]${color.reset} [PACKAGE_UPDATER] All packages are up to date.`);
			return;
		}

		const packages = JSON.parse(stdout);
		const packageNames = Object.keys(packages);

		if (packageNames.length === 0) {
			console.log(`${color.pink}[${getTimestamp()}]${color.reset} [PACKAGE_UPDATER] All packages are up to date.`);
			return;
		}

		console.log(`${color.pink}[${getTimestamp()}]${color.reset} [PACKAGE_UPDATER] Updating packages...`);
		for (const packageName of packageNames) {
			console.log(`${color.pink}[${getTimestamp()}]${color.reset} [PACKAGE_UPDATER] Updating ${packageName}...`);
			await execPromise(`npm install ${packageName}@latest`);
		}

		console.log(`${color.pink}[${getTimestamp()}]${color.reset} [PACKAGE_UPDATER] All packages have been updated.`);
	} catch (error) {
		console.error(`${color.pink}[${getTimestamp()}]${color.reset} [PACKAGE_UPDATER] Error updating packages:`, error);
	}
}

updatePackages();
