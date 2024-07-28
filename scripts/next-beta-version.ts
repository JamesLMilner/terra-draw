import { readFileSync } from "fs";

const packageJson = JSON.parse(readFileSync("./package.json", "utf-8"));

// If we're still in alpha, we want to start beta from version 1
if (packageJson.version.includes("alpha")) {
	console.log(1);
} else if (packageJson.version.includes("beta")) {
	const currentVersion = packageJson.version.split(".").pop();

	if (
		currentVersion === undefined ||
		currentVersion === null ||
		isNaN(currentVersion)
	) {
		throw new Error("Could not get current version number");
	}

	const nextVersion = parseInt(currentVersion) + 1;

	console.log(nextVersion);
} else {
	throw new Error("This script is for beta releases only");
}
