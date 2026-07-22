import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function requiredEnv(name) {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

function extractVersionSection(changelog, version) {
	const lines = changelog.split(/\r?\n/);
	const startPattern = new RegExp(`^## \\[${escapeRegExp(version)}\\]`);
	const headingPattern = /^## \[/;
	const section = [];
	let inSection = false;

	for (const line of lines) {
		if (!inSection && startPattern.test(line)) {
			inSection = true;
		}

		if (inSection) {
			if (section.length > 0 && headingPattern.test(line)) {
				break;
			}
			section.push(line);
		}
	}

	return section.join("\n").trim();
}

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function main() {
	const packageName = requiredEnv("PACKAGE_NAME");
	const packageDir = requiredEnv("PACKAGE_DIR");
	const githubOutput = requiredEnv("GITHUB_OUTPUT");
	const packageJsonPath = join(packageDir, "package.json");
	const changelogPath = join(packageDir, "CHANGELOG.md");

	const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
	const packageVersion = packageJson.version;
	if (!packageVersion) {
		throw new Error(`No version found in ${packageJsonPath}`);
	}

	const tag = `${packageName}@${packageVersion}`;
	const changelog = readFileSync(changelogPath, "utf8");
	const notes = extractVersionSection(changelog, packageVersion);

	if (!notes) {
		throw new Error(
			`Could not find changelog notes for ${packageName} ${packageVersion} in ${changelogPath}`,
		);
	}

	const title = `${packageName} ${packageVersion}`;
	const releaseBody = `${"# " + title}\n\n${notes}\n`;
	const safePackageName = packageName.replace(/[^a-zA-Z0-9_-]/g, "-");
	const releaseBodyPath = `release-body-${safePackageName}.md`;
	writeFileSync(releaseBodyPath, releaseBody, "utf8");

	appendFileSync(githubOutput, `tag=${tag}\n`, "utf8");
	appendFileSync(githubOutput, `title=${title}\n`, "utf8");
	appendFileSync(githubOutput, `notes_file=${releaseBodyPath}\n`, "utf8");

	console.log(`Generated release notes for ${tag} at ${releaseBodyPath}`);
}

main();
