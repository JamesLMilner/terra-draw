# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.0.1-alpha.13](https://github.com/JamesLMilner/terra-draw/compare/v0.0.1-alpha.12...v0.0.1-alpha.13) (2022-12-20)


### Chore

* add initial tests feature styling tests for circle, freehand and polygon ([066967c](https://github.com/JamesLMilner/terra-draw/commit/066967cd56c879186207dad9f912a1e6435904e5))
* add TerraDrawMapLibreGLAdapter and TerraDrawOpenLayersAdapter to docs ([6b78c01](https://github.com/JamesLMilner/terra-draw/commit/6b78c01df8f9bad83738bf560a9b365c7fa01290))
* add TerraDrawOpenLayersAdapter to terra-draw exports ([c5f3ade](https://github.com/JamesLMilner/terra-draw/commit/c5f3ade9b9cf51b99aa78d3730581dac6f37f0fd))
* remove default controls from all maps ([6ffde55](https://github.com/JamesLMilner/terra-draw/commit/6ffde55b4c8cf95b1fb46f76db07d47d37504c96))
* remove outdated list of adapters in README introduction ([21a6aca](https://github.com/JamesLMilner/terra-draw/commit/21a6aca27f15f0f7d90bc434865f4d362960d8d9))

### [0.0.1-alpha.12](https://github.com/JamesLMilner/terra-draw/compare/v0.0.1-alpha.11...v0.0.1-alpha.12) (2022-12-11)


### Features

* add openlayers adapter ([1454086](https://github.com/JamesLMilner/terra-draw/commit/1454086220e0b18eb504e23cca433c5db51075e3))
* add rectangle mode as a builtin mode ([ca9a12b](https://github.com/JamesLMilner/terra-draw/commit/ca9a12b449dc9ce35a268a92e8d3cdb06ba07aee))
* disable double click when a drawing mode is enabled ([ba02ac6](https://github.com/JamesLMilner/terra-draw/commit/ba02ac689052726f8a059b0548ad541bd842555f))


### Chore

* add keywords to package.json ([1270f26](https://github.com/JamesLMilner/terra-draw/commit/1270f26f0d650c97fc8c264d730231c5aac9fe43))
* add openlayers to development example ([0d24796](https://github.com/JamesLMilner/terra-draw/commit/0d24796754819bc622a071eae9af4c40d7fd1d16))
* do not use git add . with husky pre-commit hook ([032d002](https://github.com/JamesLMilner/terra-draw/commit/032d002a9212e767715876f63e4ca5bc90857a3a))
* update list of supported libraries in README ([2825d6c](https://github.com/JamesLMilner/terra-draw/commit/2825d6cb095f6709cae15887cb56a7ed26b1ef3d))

### [0.0.1-alpha.11](https://github.com/JamesLMilner/terra-draw/compare/v0.0.1-alpha.10...v0.0.1-alpha.11) (2022-11-29)


### Features

* add MapLibre adapter ([464dce4](https://github.com/JamesLMilner/terra-draw/commit/464dce418bd6f18f3043d9072f3636d051ad900a))


### Chore

* add automated documentation to the project ([0bbefbb](https://github.com/JamesLMilner/terra-draw/commit/0bbefbb8b69a18d73159b73ccdff5f79c7c0b843))

### 0.0.1-alpha.10 (2022-11-24)


### Features

* add closing point to linestring ot make easier to close for users ([e14b276](https://github.com/JamesLMilner/terra-draw/commit/e14b2769f3eb00faea55f30a24ebd4beabae92fe))
* add keybinding to allow finishing of geometries on keypress ([9b2b88e](https://github.com/JamesLMilner/terra-draw/commit/9b2b88ef4df94b8fdb5f16ded22cab6315d59cc6))
* adding closing points for drawing polygons ([c569ed6](https://github.com/JamesLMilner/terra-draw/commit/c569ed6c000683c2c9cba8fc8bec7ab5f5779a8c))
* use minimum distance approach instead of nth event for freehand ([240952d](https://github.com/JamesLMilner/terra-draw/commit/240952d2360568cba1f46340fa37360860125eed))


### Chore

* add better unit test coverage for select mode ([46f3e3c](https://github.com/JamesLMilner/terra-draw/commit/46f3e3c7dc01d8d03261af762434c296f438d2e3))
* add development to .npmignore ([8fa412f](https://github.com/JamesLMilner/terra-draw/commit/8fa412fcaef0f39d584ef6a1190391478ad12bb7))
* add docs to .npmignore ([df907c3](https://github.com/JamesLMilner/terra-draw/commit/df907c3448385d24eb2afee3ec3f083a48c14325))
* add documentaiton for development and contributing ([4148d3e](https://github.com/JamesLMilner/terra-draw/commit/4148d3e22ffce5558278e148ea569d49f63ad8a7))
* add links and licenses where appropriate ([7e5aa62](https://github.com/JamesLMilner/terra-draw/commit/7e5aa621c64e1124b9a40dc5b8570ad3247a8ba2))
* add logo to README ([149a519](https://github.com/JamesLMilner/terra-draw/commit/149a5196b37e3263fa4246c78214725f861e38be))
* add npm install instructions to README ([2094716](https://github.com/JamesLMilner/terra-draw/commit/209471665318dc9fbd4fbd31e0ba17c7843bab72))
* add precommit hooks ([752c2f8](https://github.com/JamesLMilner/terra-draw/commit/752c2f850d5db7f0d3f4a0b4f6580a1b578ca167))
* add src to .npmignore ([0d769b8](https://github.com/JamesLMilner/terra-draw/commit/0d769b8618837c2f0672034654d7a91bc1183649))
* add TerraDrawRenderMode as an export ([8f7fd60](https://github.com/JamesLMilner/terra-draw/commit/8f7fd60697ed17a2bacd7d6eddc85aced46e6fad))
* add types property at top level of package.json ([2b53b63](https://github.com/JamesLMilner/terra-draw/commit/2b53b636f5688d3bfd45b02139e61a0474739abf))
* add types to exports in package.json ([94f5b5c](https://github.com/JamesLMilner/terra-draw/commit/94f5b5c4e83124b11a2c991c7948189f53d9d865))
* bump to 0.0.1-alpha.9 ([a4bb461](https://github.com/JamesLMilner/terra-draw/commit/a4bb46192cd80199f943a9e05e1808409a75b859))
* bump to 0.1-alpha.2 ([003ddb2](https://github.com/JamesLMilner/terra-draw/commit/003ddb2055ffad92121b9c71db115466575c4378))
* bump to 0.1-alpha.3 ([f56c5d8](https://github.com/JamesLMilner/terra-draw/commit/f56c5d85d3f6eaef0ba50de9741327f5db777ad7))
* bump to 0.1-alpha.4 ([198b281](https://github.com/JamesLMilner/terra-draw/commit/198b281891dcd19c5f7396c4dcad033fec93265c))
* bump to 0.1-alpha.5 ([daa6630](https://github.com/JamesLMilner/terra-draw/commit/daa6630070452cf633e67f64c61408cb7e215a86))
* bump to 0.1-alpha.6 ([86f17d6](https://github.com/JamesLMilner/terra-draw/commit/86f17d61eb1fe59e3b9ffcb0e84ef616ccab6d84))
* bump to 0.1-alpha.7 ([0e98f38](https://github.com/JamesLMilner/terra-draw/commit/0e98f384a8813097626cec13fa0f17ffc8d5e5b9))
* bump to 0.1-alpha.8 ([5065f83](https://github.com/JamesLMilner/terra-draw/commit/5065f833534f8e117cfddebb93f164bee3c6fcd8))
* change styling API to work on a per feature level ([ef43294](https://github.com/JamesLMilner/terra-draw/commit/ef4329449f20399425c7212e50eb730e760a9dda))
* clean up website section of README ([214b39f](https://github.com/JamesLMilner/terra-draw/commit/214b39f25096f4928637c93386861d73fbe99955))
* ensure default comes last in exports object of package.json ([1b7c849](https://github.com/JamesLMilner/terra-draw/commit/1b7c8498e14db4c83d7d5c52912532379e59d114))
* fix typescript typings location ([756586a](https://github.com/JamesLMilner/terra-draw/commit/756586a8dfb283b11372ecd9df6381d375e7939a))
* more select unit tests ([e440db8](https://github.com/JamesLMilner/terra-draw/commit/e440db8328a4be85e1c4f95646c5fb447d0060a9))
* polygon closing snapping, identical coord protection ([27eceaf](https://github.com/JamesLMilner/terra-draw/commit/27eceaf102ffa1a4f57b739f061106cbd2345df2))
* readd logo ([63ee2dc](https://github.com/JamesLMilner/terra-draw/commit/63ee2dc58d544949edff61336d93996fe61424e9))
* remove docs folder ([2f74921](https://github.com/JamesLMilner/terra-draw/commit/2f749215af2854c22f61293752bac6de24e30467))
* remove futher files from publish ([b71ea63](https://github.com/JamesLMilner/terra-draw/commit/b71ea63819fd68acbc577ed79b2a4a7e81fb9ceb))
* remove styling experiment from development ([808dfbb](https://github.com/JamesLMilner/terra-draw/commit/808dfbb18fa697511a3c96595106d28046398b91))
* remove top level files ([ed39533](https://github.com/JamesLMilner/terra-draw/commit/ed3953365dbc5d1ed06f655967fac523cd33eddb))
* remove unused imports ([a2ba004](https://github.com/JamesLMilner/terra-draw/commit/a2ba004a1f4b95b83d2aefecf83fab60237a477b))
* use webpack-dev-server for development folder ([7783e6a](https://github.com/JamesLMilner/terra-draw/commit/7783e6ad79137323e9d3aceab062f62e258590e6))
