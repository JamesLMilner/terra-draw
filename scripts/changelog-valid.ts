import { readFileSync } from "fs";

const changelog = readFileSync("./CHANGELOG.md", "utf-8");
const packageJson = JSON.parse(readFileSync("./package.json", "utf-8"));

if (!packageJson || !packageJson.version) {
	throw new Error("Could not get current version from package.json");
}

if (!changelog.startsWith("# Changelog")) {
	throw new Error("Change log should start with changelog title");
}

const version = `[${packageJson.version}]`;

const changes = changelog.split("### ");

if (!changes[1].startsWith(version)) {
	throw new Error("Latest version is not latest change log title");
}

if (changes.length === 0) {
	throw new Error("No changes detected in change log");
}

if (changes.length === 1) {
	throw new Error(
		"Changelog appears invalid with only one change title and no entries",
	);
}

if (changes[0].startsWith("[") && changes[1].startsWith("[")) {
	throw new Error("Changelog should always have at least one change");
}

const lastChanges = changelog.split("### [")[1];

const lastChangesTypes = lastChanges.split("###");
lastChangesTypes.shift(); // Remove title

const lastGranularChanges = lastChanges.split("* ");

if (lastGranularChanges.length === 0) {
	throw new Error("Changelog should always have at least one change");
}

console.log(`Generated Changelog for ${packageJson.version} is valid! ✅`);
console.log(
	`${lastGranularChanges.length - 1} changes of ${
		lastChangesTypes.length
	} types`,
);
