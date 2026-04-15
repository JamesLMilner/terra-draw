module.exports = (packageName, packageJsonPath, changelogPath) => ({
	bumpFiles: [
		{
			filename: packageJsonPath,
			type: "json",
		},
	],
	packageFiles: [packageJsonPath],
	writerOpts: {
		transform: (commit, context) => {
			// Only include commits scoped to the package
			if (!commit.scope || commit.scope !== packageName) {
				return null;
			}

			// If commit message starts with automated update
			if (commit.header.includes("automated update")) {
				return null;
			}

			return commit;
		},
	},
	scripts: {
		// After we bump but before we commit, we want to update all the other packages that have a dependency on the package we just bumped
		// to make sure they are using the correct version. We also want to update the package-lock.json file to make sure it is in sync with
		// the updated package.json files.
		postbump:
			"cd ../.. && node update.mjs && npm install --package-lock-only --no-audit --no-fund && git add packages/*/package.json package-lock.json",
	},
	changelogFile: changelogPath,
	releaseCommitMessageFormat: `chore(${packageName}): release version {{currentTag}}`,
});
