/**
 * We have to manually figure out how to bump the package version based on the commits
 * as commit-and-tag-version doesn't seem to work with monorepos where scopes are used to
 * differentiate packages. We build on the conventional-recommended-bump package to determine
 * the bump type based on the commits since the last release for the current package.
 */

import * as path from 'path';
import { Bumper } from 'conventional-recommended-bump';
import { readFileSync } from "fs";

const gitPath = path.resolve('./');
const bumper = new Bumper(gitPath);
const packageName = JSON.parse(readFileSync('./package.json', 'utf8')).name;
await getBumpType(bumper, packageName);


async function getBumpType(bumper, packageName) {

    const PATCH = 0;
    const MINOR = 1;
    const MAJOR = 2;

    await bumper.loadPreset('conventionalcommits')

    const recommendation = await bumper.bump(
        (commits) => {
            let recommendation = PATCH;

            // The last commit is the one that bumped the version for the current package
            // It appears it is included in the list of commits, so we need to exclude it
            const allCommitsAfterLastRelease = commits.slice(0, -1)

            for (let commit of allCommitsAfterLastRelease) {
                if (commit.scope === packageName) {
                    if (recommendation < MAJOR && commit.type === 'feat') {
                        recommendation = MINOR;
                    }

                    if (commit.notes.some((note) => note.title === 'BREAKING CHANGE')) {
                        recommendation = MAJOR;
                    }
                }
            }

            return {
                level: recommendation,
                reason: 'Based on conventional commits',
                releaseType: ['patch', 'minor', 'major'][recommendation]
            }
        }

    )

    console.log(recommendation.releaseType)

    // TODO: Process doesn't seem to exit - probably something async still running
    process.exit(0)
}
