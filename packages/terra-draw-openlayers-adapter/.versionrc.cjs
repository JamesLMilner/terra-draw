const path = require("path");
console.log(__dirname)
throw new Error('stop');

const packageJsonPath = path.resolve(__dirname, `package.json`);
const changelogPath = path.resolve(__dirname, "/CHANGELOG.md")
const releaseConfig = require('../../release')

module.exports = releaseConfig(packageJson, packageJsonPath, changelogPath)
