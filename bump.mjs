/**
 * We have to manually figure out how to bump the package version based on the commits
 * as commit-and-tag-version doesn't seem to work with monorepos where scopes are used to
 * differentiate packages. We build on the @conventional-changelog/git-client package to determine
 * the bump type based on the commits since the last release for the current package.
 */

import * as path from 'path';
import { readFileSync } from "fs";
import { ConventionalGitClient } from '@conventional-changelog/git-client'

const gitPath = path.resolve('./');
const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'))
const currentVersion = packageJson.version
const packageName = packageJson.name;
await getBumpType(packageName);

async function getBumpType(packageName) {

    const PATCH = 0;
    const MINOR = 1;
    const MAJOR = 2;

    const gitClient = new ConventionalGitClient(gitPath);

    const commits = gitClient.getCommits({
        format: '%B%n-hash-%n%H',
        from: `${packageName}@${currentVersion}`,
    })

    let recommendation = PATCH;

    for await (const commit of commits) {

        // ConventionalGitClient does not seem to populate the scope for breaking changes with a !
        if (!commit.scope) {
            const hasScope = commit.header.includes(`(${packageName})!:`)

            if (hasScope) {
                commit.scope = packageName;
            }
        }

        if (commit.scope === packageName) {

            // If the commit type is a fix, we recommend a patch release:
            // From https://www.conventionalcommits.org/en/v1.0.0:
            // "fix: a commit of the type fix patches a bug in your codebase (this correlates with PATCH in Semantic Versioning)."
            if (recommendation < MAJOR && commit.type === 'feat') {
                recommendation = MINOR;
            }

            // There are two ways to trigger a major release either by having a footer 
            // with BREAKING CHANGE or by having a ! in the header after the scope 
            // From https://www.conventionalcommits.org/en/v1.0.0:
            // "BREAKING CHANGE: a commit that has a footer BREAKING CHANGE:, or appends a ! after the type/scope, introduces a breaking API change (correlating with MAJOR in Semantic Versioning). A BREAKING CHANGE can be part of commits of any type."
            const majorBecauseHeaderHasBang = commit.header.includes(`(${packageName})!:`)
            const majorBecauseFooterHasBreaking = commit.footer?.includes('BREAKING CHANGE')

            if (majorBecauseHeaderHasBang || majorBecauseFooterHasBreaking) {
                recommendation = MAJOR;

                // We can break out of the loop as we have found a major release and the release type will not change
                // for the rest of the commits once a major release is recommended
                break;
            }
        }
    }

    const releaseType = ['patch', 'minor', 'major'][recommendation]

    // This is the logged out to be used as the release type for the package
    console.log(releaseType)
}
