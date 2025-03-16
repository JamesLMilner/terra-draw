# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [1.2.0](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.1.0...terra-draw@1.2.0) (2025-02-23)


### docs

* **terra-draw:** fix broken link in 'adapters' page (#476) ([](https://github.com/JamesLMilner/terra-draw/commit/b24f24be73519e455a5204e237554d4c9b39988e)), closes [#476](https://github.com/JamesLMilner/terra-draw/issues/476)
* **terra-draw:** slightly simplified wording about IDs in documentation (#474) ([](https://github.com/JamesLMilner/terra-draw/commit/3e2929282ef1bc7aa32beea146c15d14f6723846)), closes [#474](https://github.com/JamesLMilner/terra-draw/issues/474)


### feat

* **terra-draw:** add editable option for linestring mode to allow moving polygons whilst drawing (#468) ([](https://github.com/JamesLMilner/terra-draw/commit/b5e38a11bc7163f79a5ab807cddce1eaf574d6a7)), closes [#468](https://github.com/JamesLMilner/terra-draw/issues/468)
* **terra-draw:** add getSnapshotFeature method to allow fetching single features easily (#471) ([](https://github.com/JamesLMilner/terra-draw/commit/55c85ec2bc7a3dc2a102415e0ad920ae76b40f14)), closes [#471](https://github.com/JamesLMilner/terra-draw/issues/471)
* **terra-draw:** allow deletion of coordinates with right clicks when editable is true (#469) ([](https://github.com/JamesLMilner/terra-draw/commit/b29dbfbd4bddce3f4909874413cf1112f9d6fb14)), closes [#469](https://github.com/JamesLMilner/terra-draw/issues/469)
* **terra-draw:** allow updating mode options dynamically via updateModeOptions method (#477) ([](https://github.com/JamesLMilner/terra-draw/commit/6fb37ab4bc31f73d6d9357e52a595c5071c695aa)), closes [#477](https://github.com/JamesLMilner/terra-draw/issues/477)


### fix

* **terra-draw:** ensure that polygons created by builtin modes abide by right hand rule (#473) ([](https://github.com/JamesLMilner/terra-draw/commit/bd27b92f1331435f4f27249271d5742d19a055f8)), closes [#473](https://github.com/JamesLMilner/terra-draw/issues/473)


### chore

* **terra-draw:** correct spelling mistakes across codebase (#463) ([](https://github.com/JamesLMilner/terra-draw/commit/7cb433f8caea3a3b4c1789152b38fa9916edf3b6)), closes [#463](https://github.com/JamesLMilner/terra-draw/issues/463)
* **terra-draw:** fix e2e tests on CI after 1.1.0 bump (#464) ([](https://github.com/JamesLMilner/terra-draw/commit/f274f53302b2defc6684ddfe1ae158fac7fecc5a)), closes [#464](https://github.com/JamesLMilner/terra-draw/issues/464)
* **terra-draw:** improve bump script to be more accurate in the recommended version (#465) ([](https://github.com/JamesLMilner/terra-draw/commit/b44377661a61d787d86ba138a74490bb0183e6a6)), closes [#465](https://github.com/JamesLMilner/terra-draw/issues/465)

## [1.1.0](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.0.0...terra-draw@1.1.0) (2025-02-03)


### chore

* **terra-draw:** add a step to update package-lock.json (#414) ([](https://github.com/JamesLMilner/terra-draw/commit/6a6ad95fd8e0e6700cd2b1bfb06dc1d2c6ff439b)), closes [#414](https://github.com/JamesLMilner/terra-draw/issues/414)
* **terra-draw:** add default title for documentation issues (#451) ([](https://github.com/JamesLMilner/terra-draw/commit/b59831bbeabcba321bf332d8037ff770636f5e5e)), closes [#451](https://github.com/JamesLMilner/terra-draw/issues/451)
* **terra-draw:** add release actions for all adapters (#408) ([](https://github.com/JamesLMilner/terra-draw/commit/890e9085f6cf16970cff05d6ab7ae33ac7f41f8f)), closes [#408](https://github.com/JamesLMilner/terra-draw/issues/408)
* **terra-draw:** automated update to package-lock.json during CI release ([](https://github.com/JamesLMilner/terra-draw/commit/19a6f89acbce4ebba62a9c75cb449bae4e2322b2))
* **terra-draw:** automatically update root package-lock.json on release (#421) ([](https://github.com/JamesLMilner/terra-draw/commit/d5551561641eac35c6027a3a06918e0e876b2237)), closes [#421](https://github.com/JamesLMilner/terra-draw/issues/421)
* **terra-draw:** bump e2e and development private packages to terra-draw v1.0.0 (#407) ([](https://github.com/JamesLMilner/terra-draw/commit/9208d9ce155c064771dcebdac600f0937628dfa6)), closes [#407](https://github.com/JamesLMilner/terra-draw/issues/407)
* **terra-draw:** ensure terra-draw is built before trying to build adapters in releases (#410) ([](https://github.com/JamesLMilner/terra-draw/commit/c0a0982c78620013e3094d1edd7fb853ba86dcc8)), closes [#410](https://github.com/JamesLMilner/terra-draw/issues/410)
* **terra-draw:** ensure that local version of commit lint is used (#430) ([](https://github.com/JamesLMilner/terra-draw/commit/5ec8e39ebfff5635dc58dc814fd9d7997d54a321)), closes [#430](https://github.com/JamesLMilner/terra-draw/issues/430)
* **terra-draw:** ensure the actions/checkout action is used in the commit-lint-prs.yml action (#429) ([](https://github.com/JamesLMilner/terra-draw/commit/b2b1a817ba81821e30c3f1131c01085b3a91a93b)), closes [#429](https://github.com/JamesLMilner/terra-draw/issues/429)
* **terra-draw:** fix issue with commit-lint-prs.yml GitHub action (#428) ([](https://github.com/JamesLMilner/terra-draw/commit/61994851902496b067e6cde5145074bfbe8b6300)), closes [#428](https://github.com/JamesLMilner/terra-draw/issues/428)
* **terra-draw:** fix leaflet adapter package version that does not exist for e2e package.json (#416) ([](https://github.com/JamesLMilner/terra-draw/commit/1661be48ef441368b327649dbab4660d5310ede2)), closes [#416](https://github.com/JamesLMilner/terra-draw/issues/416)
* **terra-draw:** fix small issues with releasing actions adapters (#411) ([](https://github.com/JamesLMilner/terra-draw/commit/f594e758f0c1cbf4028020d82d9c45f695f89170)), closes [#411](https://github.com/JamesLMilner/terra-draw/issues/411)
* **terra-draw:** fix tagging when releasing via actions (#412) ([](https://github.com/JamesLMilner/terra-draw/commit/5933f6ced3f7b5057372f18fbc6d77eefadb0e81)), closes [#412](https://github.com/JamesLMilner/terra-draw/issues/412)
* **terra-draw:** fix the getting started guides Leaflet adapter import (#418) ([](https://github.com/JamesLMilner/terra-draw/commit/fcb749b5377545728afa41f8ef13d46b6f9cd0d7)), closes [#418](https://github.com/JamesLMilner/terra-draw/issues/418)
* **terra-draw:** improve the release commit message when releasing (#413) ([](https://github.com/JamesLMilner/terra-draw/commit/26bf5f136cd19c6936efb9e5e3f284f6c7afc017)), closes [#413](https://github.com/JamesLMilner/terra-draw/issues/413)
* **terra-draw:** remove package-lock.json update as part of release for now (#415) ([](https://github.com/JamesLMilner/terra-draw/commit/b121584d51690561814d2cef3039525e08e7c173)), closes [#415](https://github.com/JamesLMilner/terra-draw/issues/415)
* **terra-draw:** remove pr-conventional-commits and use commitlint cli to validate PR titles (#427) ([](https://github.com/JamesLMilner/terra-draw/commit/14c25991aaa2b15ad892b416f7a7a79f03319fd4)), closes [#427](https://github.com/JamesLMilner/terra-draw/issues/427)
* **terra-draw:** remove references to @beta from tsdocs strings (#453) ([](https://github.com/JamesLMilner/terra-draw/commit/023073583e965abe9fc19d1777a32714b4bb46e5)), closes [#453](https://github.com/JamesLMilner/terra-draw/issues/453)
* **terra-draw:** update javascript versions of supported libraries to be accurate in README (#409) ([](https://github.com/JamesLMilner/terra-draw/commit/7b91107eb2afe0cfaae007f75f1c7e6804a30ede)), closes [#409](https://github.com/JamesLMilner/terra-draw/issues/409)
* **terra-draw:** update package-lock.json to include new 1.0.0 adapters ([](https://github.com/JamesLMilner/terra-draw/commit/ce982a8b8ce3a666a8142e581ac63a7de088df81))
* **terra-draw:** use --release-as with custom bumper as scopes are not being respected (#459) ([](https://github.com/JamesLMilner/terra-draw/commit/cd4d2c16cc803918ae3ea8e4c0913321721bb674)), closes [#459](https://github.com/JamesLMilner/terra-draw/issues/459)
* **terra-draw:** use a custom README for the terra-draw package (#460) ([](https://github.com/JamesLMilner/terra-draw/commit/4ccd4b5d5afeee676820e350ff04b14e2b1aad1e)), closes [#460](https://github.com/JamesLMilner/terra-draw/issues/460)
* **terra-draw:** use npm ci rather than npm install for ci actions (#431) ([](https://github.com/JamesLMilner/terra-draw/commit/eff7dd0a12b8ba9692aa0f685a11378b4116f8ce)), closes [#431](https://github.com/JamesLMilner/terra-draw/issues/431)
* **terra-draw:** use the root level README for the terra-draw package (#455) ([](https://github.com/JamesLMilner/terra-draw/commit/d93ca9bfed2e1c8f9bacbe4eb5316b0e8f1a779c)), closes [#455](https://github.com/JamesLMilner/terra-draw/issues/455)
* **terra-draw:** use the src files for development package rather than the dist (#456) ([](https://github.com/JamesLMilner/terra-draw/commit/5d45d401678de736dd09fba5efd1a35d632dc790)), closes [#456](https://github.com/JamesLMilner/terra-draw/issues/456)


### fix

* **terra-draw:** ensure getFeaturesAtPointerEvent has optional options properties (#454) ([](https://github.com/JamesLMilner/terra-draw/commit/5a4283653274e6c4add014a784eecb36f4d996b5)), closes [#454](https://github.com/JamesLMilner/terra-draw/issues/454)
* **terra-draw:** fix issue deleting line string coordinate points in select mode (#452) ([](https://github.com/JamesLMilner/terra-draw/commit/9e3aab16e4ce3c82bf816fb257c417f720f17baf)), closes [#452](https://github.com/JamesLMilner/terra-draw/issues/452)
* **terra-draw:** resolve issue where coordinates cannot be draggable if feature id is 0 (#423) ([](https://github.com/JamesLMilner/terra-draw/commit/b4a776c51a97d0ab8751b2c79ed21649d869a363)), closes [#423](https://github.com/JamesLMilner/terra-draw/issues/423)


### docs

* **terra-draw:** add details to the STORE guide about valid geometry types for addFeatures (#426) ([](https://github.com/JamesLMilner/terra-draw/commit/cdcb3aa2f75d9ea49dcba63a20f9caf7e79b4502)), closes [#426](https://github.com/JamesLMilner/terra-draw/issues/426)
* **terra-draw:** change two incorrect apostrophes in 7.DEVELOPMENT.md (#444) ([](https://github.com/JamesLMilner/terra-draw/commit/581adc8573900fb3181030eb6b054c337ef4aa30)), closes [#444](https://github.com/JamesLMilner/terra-draw/issues/444)
* **terra-draw:** fix discrepancy in event documentation (#390) ([](https://github.com/JamesLMilner/terra-draw/commit/9a4ed7a74e64f38164ec248670b75e360ce50884)), closes [#390](https://github.com/JamesLMilner/terra-draw/issues/390)
* **terra-draw:** fix spelling and grammar issues in 2.STORE.md (#445) ([](https://github.com/JamesLMilner/terra-draw/commit/5b08dbddf85f67d0dc71897433347253921e11f8)), closes [#445](https://github.com/JamesLMilner/terra-draw/issues/445)
* **terra-draw:** fix spelling and grammar issues in 4.MODES.md (#446) ([](https://github.com/JamesLMilner/terra-draw/commit/fc39d446a41935c8d5780bf8d9ffcc86b19b939f)), closes [#446](https://github.com/JamesLMilner/terra-draw/issues/446)
* **terra-draw:** fix spelling and indefinite article in 8.EXAMPLES.md (#447) ([](https://github.com/JamesLMilner/terra-draw/commit/89cfd24d3a7b90484d12631127a422efae4636c8)), closes [#447](https://github.com/JamesLMilner/terra-draw/issues/447)
* **terra-draw:** fix spelling and punctuation in 5.STYLING.md (#449) ([](https://github.com/JamesLMilner/terra-draw/commit/7aa7c944ab09d07e71521ef26349c85098da999f)), closes [#449](https://github.com/JamesLMilner/terra-draw/issues/449)


### feat

* **terra-draw:** add editable option for point mode to allow moving points whilst drawing (#443) ([](https://github.com/JamesLMilner/terra-draw/commit/9a85b89c23e3422331ab584d8b564bc08a2d8156)), closes [#443](https://github.com/JamesLMilner/terra-draw/issues/443)
* **terra-draw:** add editable option for polygon mode to allow moving polygons whilst drawing (#450) ([](https://github.com/JamesLMilner/terra-draw/commit/cf997346e76aa97c20a611d4a2aafe25a635379a)), closes [#450](https://github.com/JamesLMilner/terra-draw/issues/450)

## [1.0.0](https://github.com/JamesLMilner/terra-draw/compare/v1.0.0-beta.11...v1.0.0) (2025-01-12)


### ⚠ BREAKING CHANGE

* **terra-draw:** setup Terra Draw into separate packages for the separate adapters (#395)

### chore

* **terra-draw:** add a dry run release script for terra-draw (#397) ([](https://github.com/JamesLMilner/terra-draw/commit/78658d47d9cae122f0447626985d178613c846aa)), closes [#397](https://github.com/JamesLMilner/terra-draw/issues/397)
* **terra-draw:** add an action for full release of terra-draw (#398) ([](https://github.com/JamesLMilner/terra-draw/commit/6e02a1d1f34ba7c42cf9b3d4c44d5900d59f8772)), closes [#398](https://github.com/JamesLMilner/terra-draw/issues/398)
* **terra-draw:** ensure release script for terra-draw is named correctly (#399) ([](https://github.com/JamesLMilner/terra-draw/commit/f523d68865f07fa2b306488bd1aa66568827c796)), closes [#399](https://github.com/JamesLMilner/terra-draw/issues/399)


### feat

* **terra-draw:** setup Terra Draw into separate packages for the separate adapters (#395) ([](https://github.com/JamesLMilner/terra-draw/commit/27858a8b23de1fd3601ac6fb97a91fba134bb120)), closes [#395](https://github.com/JamesLMilner/terra-draw/issues/395)

## [1.1.0](https://github.com/JamesLMilner/terra-draw/compare/v1.0.0-beta.11...v1.1.0) (2025-01-06)


### feat

* **terra-draw:** split Terra Draw into separate packages ([](https://github.com/JamesLMilner/terra-draw/commit/fdc95314f31863e22095f274e5301dd97b0e72e7))
