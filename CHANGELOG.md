# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.0.1-alpha.33](https://github.com/JamesLMilner/terra-draw/compare/v0.0.1-alpha.32...v0.0.1-alpha.33) (2023-06-04)


### Bug Fixes

* improve performance of mapbox gl/maplibre gl adapter ([67082af](https://github.com/JamesLMilner/terra-draw/commit/67082af096cf1b1d5a0426f7db651122fb897b49))

### [0.0.1-alpha.32](https://github.com/JamesLMilner/terra-draw/compare/v0.0.1-alpha.31...v0.0.1-alpha.32) (2023-06-04)


### Features

* add the addFeatures method to allow adding of external data ([b6e0043](https://github.com/JamesLMilner/terra-draw/commit/b6e004377f1baff78e01f9324413469677f2df5b))


### Chore

* update docs ([36997cc](https://github.com/JamesLMilner/terra-draw/commit/36997cc7c7071af1af1a27ad457cab0361f3e5e9))

### [0.0.1-alpha.31](https://github.com/JamesLMilner/terra-draw/compare/v0.0.1-alpha.30...v0.0.1-alpha.31) (2023-05-22)


### Features

* add onFinish event to terra draw ([fb36988](https://github.com/JamesLMilner/terra-draw/commit/fb36988ce3e291f4198e38a455d385eb40db326b))


### Chore

* update docs ([ed78e25](https://github.com/JamesLMilner/terra-draw/commit/ed78e2575b789429f08a4c0b96041bdf4deed5b9))

### [0.0.1-alpha.30](https://github.com/JamesLMilner/terra-draw/compare/v0.0.1-alpha.29...v0.0.1-alpha.30) (2023-05-21)


### Bug Fixes

* allow wait as a setCursor parameter ([839bb90](https://github.com/JamesLMilner/terra-draw/commit/839bb906999420931f3b2833be781688a2ec39be))
* clear now removes all rendered layers ([fd7a208](https://github.com/JamesLMilner/terra-draw/commit/fd7a2081338b4d6ebfc3e93a6580a38b9649343a))
* correctly name styling typings for rectangle mode ([a460a3a](https://github.com/JamesLMilner/terra-draw/commit/a460a3aa7411f275d72930f5d41bd76de107c1d9))


### Chore

* update docs ([ea4f52c](https://github.com/JamesLMilner/terra-draw/commit/ea4f52ca091772c8bed2c1b6c103db7b4734eb6e))

### [0.0.1-alpha.29](https://github.com/JamesLMilner/terra-draw/compare/v0.0.1-alpha.28...v0.0.1-alpha.29) (2023-05-14)


### Chore

* prefer top level types for easier importing ([5570bb2](https://github.com/JamesLMilner/terra-draw/commit/5570bb29ac1ca351f5b4c71625ddfd666738cbac))

### [0.0.1-alpha.28](https://github.com/JamesLMilner/terra-draw/compare/v0.0.1-alpha.27...v0.0.1-alpha.28) (2023-05-14)


### Chore

* export necessary types for proper 3rd party extension ([843fe2f](https://github.com/JamesLMilner/terra-draw/commit/843fe2fb5a992055908347028d50db9433399385))

### [0.0.1-alpha.27](https://github.com/JamesLMilner/terra-draw/compare/v0.0.1-alpha.26...v0.0.1-alpha.27) (2023-05-06)


### Bug Fixes

* address potential issue with spreading Sets for the held keys ([7fdf0b0](https://github.com/JamesLMilner/terra-draw/commit/7fdf0b0e9acfb108dd45e3a23f0e1d2160ca9b53))
* ensure that container coordinates are correct when they are nested ([13aef09](https://github.com/JamesLMilner/terra-draw/commit/13aef09abfbab22815790a4968b365a2e3c06176))


### Chore

* add leaflet adapter unit tests ([8f4e6f3](https://github.com/JamesLMilner/terra-draw/commit/8f4e6f35771cd82d89823c66878a4e64732397b0))
* update docs ([1a8b15b](https://github.com/JamesLMilner/terra-draw/commit/1a8b15b82ba5b14eba9bcdfb225941611dc5d4bd))

### [0.0.1-alpha.26](https://github.com/JamesLMilner/terra-draw/compare/v0.0.1-alpha.25...v0.0.1-alpha.26) (2023-04-10)


### Features

* avoid mass creation and deletion of geometries in leaflet adapter render ([773208a](https://github.com/JamesLMilner/terra-draw/commit/773208a9350069849fab45e814a4ba8ad20187dd))

### [0.0.1-alpha.25](https://github.com/JamesLMilner/terra-draw/compare/v0.0.1-alpha.24...v0.0.1-alpha.25) (2023-04-07)


### Features

* allow zIndexing of linestrings and polygons for TerraDrawLeafletAdapter ([17a4441](https://github.com/JamesLMilner/terra-draw/commit/17a44416244490b5710560ef1fb20dc728a4730d))

### [0.0.1-alpha.24](https://github.com/JamesLMilner/terra-draw/compare/v0.0.1-alpha.23...v0.0.1-alpha.24) (2023-04-07)


### Features

* export base adapter and mode so that 3rd party developers can extend ([1662960](https://github.com/JamesLMilner/terra-draw/commit/16629602d8cb7f9b7d163c581ebe23abfd734c5d))


### Chore

* add example drawing gif image to readme ([edde444](https://github.com/JamesLMilner/terra-draw/commit/edde4442bc3aa6b6854d708edb477bb068331f8e))
* crop gif to make it a bit cleaner ([6fc4adf](https://github.com/JamesLMilner/terra-draw/commit/6fc4adfb12236428101b8a579649b9ff8ee3e946))
* update docs ([75c0848](https://github.com/JamesLMilner/terra-draw/commit/75c0848e582db24e287ff81d628de0486ad1e4e7))

### [0.0.1-alpha.23](https://github.com/JamesLMilner/terra-draw/compare/v0.0.1-alpha.22...v0.0.1-alpha.23) (2023-04-04)


### Features

* cache container for all adapters to avoid refetching it ([d0e3332](https://github.com/JamesLMilner/terra-draw/commit/d0e3332c873587f5c148b4999b46fc4392d84393))
* google maps adapter now uses base pointer based event system ([03b131d](https://github.com/JamesLMilner/terra-draw/commit/03b131db9d5ed4fd4658bf7dd2fba16dbb45b04a))
* move google maps to use base adapter ([5e52f4d](https://github.com/JamesLMilner/terra-draw/commit/5e52f4d849ec3fd2e0371f121a1bf5aac2b5491e))
* move mapbox adapter to use the base adapter ([08ddb8e](https://github.com/JamesLMilner/terra-draw/commit/08ddb8e0ff3b37628aef9893a28d52ef1e98536b))
* move openlayers adapter to use base event adapter ([92213f8](https://github.com/JamesLMilner/terra-draw/commit/92213f8ee4943825e6ddb036ceea21658b5ca8a7))


### Bug Fixes

* turn off tolerance on geojson layers for mapbox/maplibre adapters ([fb1e7a2](https://github.com/JamesLMilner/terra-draw/commit/fb1e7a2b26f30a26026bb1211211d18a7600a6f5))


### Chore

* add better comments around the getting started example ([811d5b6](https://github.com/JamesLMilner/terra-draw/commit/811d5b6178c5cc4eb63fa5aacd4cdca6928aa87f))
* add getting started guide ([c926568](https://github.com/JamesLMilner/terra-draw/commit/c926568f68ee87fb48795b9d34b176ba82bf99a0))
* add useful comments to adapter listener ([e882911](https://github.com/JamesLMilner/terra-draw/commit/e8829119658f0d636beb8ff9ef4cf4d8f8d69706))
* better typescript typing for onStyleChange ([476fe3c](https://github.com/JamesLMilner/terra-draw/commit/476fe3c6f89a34a66e916dbc91a9fd6a3b2accb0))
* bump typedoc ([be457de](https://github.com/JamesLMilner/terra-draw/commit/be457de36e03a2d00c9831af7247079e08914dc0))
* bump typescript to version 5 ([0dedc54](https://github.com/JamesLMilner/terra-draw/commit/0dedc54042d2019f00117b3764ee09a5195deaf0))
* create start and stop as abstract methods on base.mode ([bb1d330](https://github.com/JamesLMilner/terra-draw/commit/bb1d330060dfad72af921e1c76672b6b151427d3))
* fix polygon.mode.spec test for offset change ([23ef0ab](https://github.com/JamesLMilner/terra-draw/commit/23ef0ab981115e1a5172e68cd13cf19c0c5c2f0b))
* improve guides with additional information for new users ([ec785d5](https://github.com/JamesLMilner/terra-draw/commit/ec785d5f82f2f40acc730ad11cbb388cd312d480))
* minor tidy up to all adapters ([e644459](https://github.com/JamesLMilner/terra-draw/commit/e644459459faee21854d51436c6730b3932e80f0))
* remove logs ([a7c00c2](https://github.com/JamesLMilner/terra-draw/commit/a7c00c28b69e54cfe69454e4501dd4fee8eaa1d7))
* remove uncessary override of point mode setStarted ([e8bebca](https://github.com/JamesLMilner/terra-draw/commit/e8bebcadc34315d3da1d0e05bb4939343cbe0c64))
* rename base-adapter.ts to base.adapter.ts for consistency ([753c77c](https://github.com/JamesLMilner/terra-draw/commit/753c77c8ecc2f6b88c668ba5432e681db98b5221))
* swap leaflet and openlayers ordering in development app ([4ebf3c8](https://github.com/JamesLMilner/terra-draw/commit/4ebf3c837dc84d710fd0fd8e341e4f63d820c05e))
* update docs ([29ff37a](https://github.com/JamesLMilner/terra-draw/commit/29ff37a37f1b744df299a724d6da324ed31f1045))
* update wording around getting started guide ([f6bc21e](https://github.com/JamesLMilner/terra-draw/commit/f6bc21eb6c811af2bd1f59289dedc124c29cfca6))

### [0.0.1-alpha.22](https://github.com/JamesLMilner/terra-draw/compare/v0.0.1-alpha.21...v0.0.1-alpha.22) (2023-03-26)


### Features

* add custom event pointer event handling system, use in leaflet adapter ([68c551b](https://github.com/JamesLMilner/terra-draw/commit/68c551bf99f0ca37053456a3815cee8fad0c1108))


### Chore

* update docs ([a8a91c3](https://github.com/JamesLMilner/terra-draw/commit/a8a91c39a899b5715d74875da63735360b9129f8))

### [0.0.1-alpha.21](https://github.com/JamesLMilner/terra-draw/compare/v0.0.1-alpha.20...v0.0.1-alpha.21) (2023-03-24)


### Bug Fixes

* remove scratch folder ([6c671d6](https://github.com/JamesLMilner/terra-draw/commit/6c671d67ac9fec88e00774095beeb0d17738b563))

### [0.0.1-alpha.20](https://github.com/JamesLMilner/terra-draw/compare/v0.0.1-alpha.19...v0.0.1-alpha.20) (2023-03-24)


### Bug Fixes

* reuse draw even in leaflet adapter to prevent runtime error ([d7f6f34](https://github.com/JamesLMilner/terra-draw/commit/d7f6f34667ccb39715c6f22a1941d2e0c37d002f))

### [0.0.1-alpha.19](https://github.com/JamesLMilner/terra-draw/compare/v0.0.1-alpha.18...v0.0.1-alpha.19) (2023-03-23)


### Bug Fixes

* remove mousemove event listener from leaflet adapter and replace with pointermove ([b7baa4c](https://github.com/JamesLMilner/terra-draw/commit/b7baa4c828cce1a8a1e8cd94b8f44f0a30ea6762))


### Chore

* update docs folder ([62b80dc](https://github.com/JamesLMilner/terra-draw/commit/62b80dce039ebfb4f0729fa41c07392dc5eedf0d))

### [0.0.1-alpha.18](https://github.com/JamesLMilner/terra-draw/compare/v0.0.1-alpha.17...v0.0.1-alpha.18) (2023-03-19)


### Bug Fixes

* better parity between mouse and pointer experiences ([00c219d](https://github.com/JamesLMilner/terra-draw/commit/00c219de114383d7e3f7ad58d91fc6de9c2bb7c9))
* ensure that closing points for polygons are update on click ([25c0886](https://github.com/JamesLMilner/terra-draw/commit/25c0886237c56881073e44da839b07527362662c))


### Chore

* fix issues with prettier conflicting with eslint ([9849bce](https://github.com/JamesLMilner/terra-draw/commit/9849bce825f2073d1b72b0dc9a29718a0cb994d9))

### [0.0.1-alpha.17](https://github.com/JamesLMilner/terra-draw/compare/v0.0.1-alpha.16...v0.0.1-alpha.17) (2023-03-12)


### Bug Fixes

* fix unit test for great-circle-snapping.behavior ([c90cd86](https://github.com/JamesLMilner/terra-draw/commit/c90cd86125339d43768bf6f0936f85bc09bd6833))
* use project/unproject to get midpoints that are visually centered ([3581da2](https://github.com/JamesLMilner/terra-draw/commit/3581da2cd89ace7c555c747cdae8115c90ec851d))


### Chore

* add better test coverage for great circle mode ([4073553](https://github.com/JamesLMilner/terra-draw/commit/4073553563cdfece1f48c3b00a86a6a19457a820))
* husk precommit only readd linted files ([2eb6138](https://github.com/JamesLMilner/terra-draw/commit/2eb6138a47fc5f48334bcf7b657fa4ac8783dc76))
* make sure all mode tests are labelled correctly ([a5dfe4b](https://github.com/JamesLMilner/terra-draw/commit/a5dfe4bd79cfb33daaf47195e05b72e0fba4087c))
* make sure test files are no covered in jest coverage when type checking disabled ([0b271b6](https://github.com/JamesLMilner/terra-draw/commit/0b271b6bf9f764c03bea1f3f4a9bc949ffa830e6))
* remove unused import from static.mode.spec.ts ([e2bf578](https://github.com/JamesLMilner/terra-draw/commit/e2bf5785f00bf92c72f6054441212a1e98d07abe))

### [0.0.1-alpha.16](https://github.com/JamesLMilner/terra-draw/compare/v0.0.1-alpha.15...v0.0.1-alpha.16) (2023-02-19)


### Features

* add great circle line mode ([72136a0](https://github.com/JamesLMilner/terra-draw/commit/72136a044ed3a7c9192e92fbb383e64243ce8bd6))


### Chore

* add local scratch folder to allow for experimentation ([828e1dd](https://github.com/JamesLMilner/terra-draw/commit/828e1ddfa575a8a9703c63c3bf8d1f11535e3fef))
* fix scratch pad folder location for local development ([107db58](https://github.com/JamesLMilner/terra-draw/commit/107db581a94852925f7b647f77b67b67f0a7598d))

### [0.0.1-alpha.15](https://github.com/JamesLMilner/terra-draw/compare/v0.0.1-alpha.14...v0.0.1-alpha.15) (2023-02-05)


### Features

* allow keyEvents to be set to null to prevent keyboard interactions on modes ([6af865c](https://github.com/JamesLMilner/terra-draw/commit/6af865cffa58063e422c69a4201b2ab9f37f019a))


### Chore

* better handle event listening in adapters by creating AdapterListener abstraction ([7f0cac6](https://github.com/JamesLMilner/terra-draw/commit/7f0cac6cc28c33387e049ef4cf3bd7f05c4a57a2))
* readd precommit git add command ([bc57234](https://github.com/JamesLMilner/terra-draw/commit/bc57234cb7ceca1ee8c9aa8592e87ce0c389e70c))
* update docs ([d0c9454](https://github.com/JamesLMilner/terra-draw/commit/d0c94547eb7cd9fc4379c40ef827b9f15df577a5))

### [0.0.1-alpha.14](https://github.com/JamesLMilner/terra-draw/compare/v0.0.1-alpha.13...v0.0.1-alpha.14) (2023-01-08)


### Features

* add clear to the public API ([6a8fa72](https://github.com/JamesLMilner/terra-draw/commit/6a8fa722b52047bdf7bc4cfb42d1432eaf7ff038))


### Bug Fixes

* ensure that terra draw is enabled before calling setMode ([deff0fb](https://github.com/JamesLMilner/terra-draw/commit/deff0fb34888fd8a36778254ed8448e7711abdb8))
* make sure circle mode respects configured coordinate precision ([cba0aa7](https://github.com/JamesLMilner/terra-draw/commit/cba0aa73d2d623f53b66e2d503077519f920dc96))


### Chore

* add npm badge to README, shorten CI badge text ([e9d7b66](https://github.com/JamesLMilner/terra-draw/commit/e9d7b6611f7b342d2dc65a381f940babcea4f889))
* bump dependency packages ([a7a2bcf](https://github.com/JamesLMilner/terra-draw/commit/a7a2bcfdee6c9da773f4cf973c7f342f75822a12))
* fix the README logo ([b48d6d7](https://github.com/JamesLMilner/terra-draw/commit/b48d6d7d4da0dbc43da86bf43d08bc17c1463073))

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
