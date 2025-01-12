const path = require("path");
const packageJsonPath = path.resolve(__dirname, `package.json`);
const packageName = require(packageJsonPath).name
console.log(`✔ Package: ${packageName}`)

const changelogPath = path.resolve(__dirname, "/CHANGELOG.md")
const releaseConfig = require('../../release')

module.exports = releaseConfig(packageName, packageJsonPath, changelogPath)

