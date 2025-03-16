import { readFileSync, writeFileSync, readdirSync } from "fs";

// Get a list of all package file names
const packagesRaw = readdirSync('./packages', { encoding: 'utf8' });

// Ignore .DS_Store or other local ignored files
const packages = packagesRaw.filter((name) => !name.startsWith('.'))

const latestVersions = {}

for (let i = 0; i < packages.length; i++) {
    const packageName = packages[i];
    const packagePath = `./packages/${packageName}/package.json`
    const packageJsonString = readFileSync(packagePath, 'utf8');
    const packageJson = JSON.parse(packageJsonString)

    latestVersions[packageName] = packageJson.version
}

const isValidInteger = (n) => !isNaN(Number(n))

// We loop through all relevant packages
for (let i = 0; i < packages.length; i++) {
    for (let j = 0; j < packages.length; j++) {
        if (i === j) {
            continue;
        }

        const bumpedPackageName = packages[j];
        const bumpedPackageVersion = latestVersions[bumpedPackageName];

        const version = bumpedPackageVersion.split('.')

        if (version.length !== 3) {
            throw new Error(`Passed bumped version is not valid: ${bumpedPackageVersion}`)
        }

        if (!isValidInteger(version[0])) {
            throw new Error(`Major version is not valid: ${version[0]}`)
        }

        if (!isValidInteger(version[1])) {
            throw new Error(`Major version is not valid: ${version[1]}`)
        }

        if (!isValidInteger(version[2])) {
            throw new Error(`Major version is not valid: ${version[2]}`)
        }

        const packageName = packages[i];
        const packagePath = `./packages/${packageName}/package.json`
        const packageJsonString = readFileSync(packagePath, 'utf8');
        const packageJson = JSON.parse(packageJsonString)
        const currentPackageVersion = packageJson.dependencies && packageJson.dependencies[bumpedPackageName]

        // If the package is listed as a dependency, bump it
        if (currentPackageVersion) {
            // Case where they are already bumped so do nothing
            if (packageJson.dependencies[bumpedPackageName] === bumpedPackageVersion) {
                console.log(`${bumpedPackageName} is used in ${packageName}! Package is already set to ${bumpedPackageVersion}`)
            }
            // Case where they are not matching and it needs to be updated
            else {
                console.log(`${bumpedPackageName} is used in ${packageName}! Bumping from ${currentPackageVersion} to ${bumpedPackageVersion}`)
                packageJson.dependencies[bumpedPackageName] = bumpedPackageVersion;
                writeFileSync(packagePath, JSON.stringify(packageJson, null, '\t'), 'utf8')
            }
        }
    }
}

console.log('Finished!')