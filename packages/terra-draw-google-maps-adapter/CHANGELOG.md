# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [1.3.0](https://github.com/JamesLMilner/terra-draw/compare/terra-draw-google-maps-adapter@1.2.1...terra-draw-google-maps-adapter@1.3.0) (2026-02-01)


### chore

* **terra-draw-google-maps-adapter:** add support for polygon outline opacity (#795) ([](https://github.com/JamesLMilner/terra-draw/commit/f33d401127fe1e37da2b090e67e5d2379ad43424)), closes [#795](https://github.com/JamesLMilner/terra-draw/issues/795)


### feat

* **terra-draw-google-maps-adapter:** add support for point and linestring opacity (#787) ([](https://github.com/JamesLMilner/terra-draw/commit/3d8c0e8341be3f87a61afcf1012e806ebb519b5a)), closes [#787](https://github.com/JamesLMilner/terra-draw/issues/787)

## [1.2.1](https://github.com/JamesLMilner/terra-draw/compare/terra-draw-google-maps-adapter@1.2.0...terra-draw-google-maps-adapter@1.2.1) (2026-01-02)


### fix

* **terra-draw-google-maps-adapter:** use rAF to fix issues with external geometries and improve perf (#764) ([](https://github.com/JamesLMilner/terra-draw/commit/6dd34829e2ea88b027dbb45354b43adce9f8cd0e)), closes [#764](https://github.com/JamesLMilner/terra-draw/issues/764)

## [1.2.0](https://github.com/JamesLMilner/terra-draw/compare/terra-draw-google-maps-adapter@1.1.2...terra-draw-google-maps-adapter@1.2.0) (2026-01-02)


### feat

* **terra-draw-google-maps-adapter:** allow use of @googlemaps/js-api-loader v2 (#762) ([](https://github.com/JamesLMilner/terra-draw/commit/08438b8b901148f53782a5fae21455de500385d4)), closes [#762](https://github.com/JamesLMilner/terra-draw/issues/762)

## [1.1.2](https://github.com/JamesLMilner/terra-draw/compare/terra-draw-google-maps-adapter@1.1.1...terra-draw-google-maps-adapter@1.1.2) (2025-12-02)


### fix

* **terra-draw-google-maps-adapter:** fix keyboard events not firing when map is focused (#734) ([](https://github.com/JamesLMilner/terra-draw/commit/6ad94fc1eaea7b5a9da1d5f893d9040e4237f50c)), closes [#734](https://github.com/JamesLMilner/terra-draw/issues/734)

## [1.1.1](https://github.com/JamesLMilner/terra-draw/compare/terra-draw-google-maps-adapter@1.1.0...terra-draw-google-maps-adapter@1.1.1) (2025-11-30)


### fix

* **terra-draw-google-maps-adapter:** ensure coordinates are accurate in fullscreen mode (#726) ([](https://github.com/JamesLMilner/terra-draw/commit/7f7faf6a0e9b472eaf51be519975d974ccd3649c)), closes [#726](https://github.com/JamesLMilner/terra-draw/issues/726)
* **terra-draw-google-maps-adapter:** solve data.setStyle teardown issues - #724 (#725) ([](https://github.com/JamesLMilner/terra-draw/commit/ccbf1cc32fc24c22f727edaf1e0639aedf658d00)), closes [#724](https://github.com/JamesLMilner/terra-draw/issues/724) [#725](https://github.com/JamesLMilner/terra-draw/issues/725)

## [1.1.0](https://github.com/JamesLMilner/terra-draw/compare/terra-draw-google-maps-adapter@1.0.4...terra-draw-google-maps-adapter@1.1.0) (2025-10-12)


### feat

* **terra-draw-google-maps-adapter:** add marker support (#672) ([](https://github.com/JamesLMilner/terra-draw/commit/92ca10fa294fb21b148e4e630640b3ef2c239662)), closes [#672](https://github.com/JamesLMilner/terra-draw/issues/672)

## [1.0.4](https://github.com/JamesLMilner/terra-draw/compare/terra-draw-google-maps-adapter@1.0.3...terra-draw-google-maps-adapter@1.0.4) (2025-09-17)


### fix

* **terra-draw-google-maps-adapter:** remove id requirement (#650) ([](https://github.com/JamesLMilner/terra-draw/commit/1c7cbe1f06e3c9779b38885f9789cba76f5ff1b8)), closes [#650](https://github.com/JamesLMilner/terra-draw/issues/650)

## [1.0.3](https://github.com/JamesLMilner/terra-draw/compare/terra-draw-google-maps-adapter@1.0.2...terra-draw-google-maps-adapter@1.0.3) (2025-09-01)


### fix

* **terra-draw-google-maps-adapter:** feature id was not set in the style rendering functions (#640) ([](https://github.com/JamesLMilner/terra-draw/commit/b43a4aad6679adc2542147cbebc6dd276675307a)), closes [#640](https://github.com/JamesLMilner/terra-draw/issues/640)

## [1.0.2](https://github.com/JamesLMilner/terra-draw/compare/terra-draw-google-maps-adapter@1.0.1...terra-draw-google-maps-adapter@1.0.2) (2025-08-26)


### fix

* **terra-draw-google-maps-adapter:** ensure onAdd is only called once per adapter registration (#631) ([](https://github.com/JamesLMilner/terra-draw/commit/03b0b5e1246c80ae74da3ccb956d553f139e50be)), closes [#631](https://github.com/JamesLMilner/terra-draw/issues/631)

## [1.0.1](https://github.com/JamesLMilner/terra-draw/compare/terra-draw-google-maps-adapter@1.0.0...terra-draw-google-maps-adapter@1.0.1) (2025-08-25)


### fix

* **terra-draw-google-maps-adapter:** fix stop throwing an error when called (#628) ([](https://github.com/JamesLMilner/terra-draw/commit/a6349b52d87a73f7a0d7b142f9ee11a7a2a942c2)), closes [#628](https://github.com/JamesLMilner/terra-draw/issues/628)
* **terra-draw-google-maps-adapter:** initial handling of zIndexes in the render function (#512) ([](https://github.com/JamesLMilner/terra-draw/commit/7448794348f119f174248aba40ce8e199a256603)), closes [#512](https://github.com/JamesLMilner/terra-draw/issues/512)

## 1.0.0 (2025-01-12)


### ⚠ BREAKING CHANGE

* **terra-draw-google-maps-adapter:** breaking change commit to allow adapter to v1.0.0 (#401)

### feat

* **terra-draw-google-maps-adapter:** breaking change commit to allow adapter to v1.0.0 (#401) ([](https://github.com/JamesLMilner/terra-draw/commit/2c182960024d517572882986cb93cf5eb6ced78c)), closes [#401](https://github.com/JamesLMilner/terra-draw/issues/401)
