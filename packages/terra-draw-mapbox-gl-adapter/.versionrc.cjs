const path = require("path");
const packageJson = path.resolve(__dirname, `package.json`);
const changelogPath = path.resolve(__dirname, "/CHANGELOG.md")
const releaseConfig = require('../../release')

module.exports = releaseConfig(packageJson, changelogPath)
