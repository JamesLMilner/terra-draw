# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [1.2.2](https://github.com/JamesLMilner/terra-draw/compare/terra-draw-maplibre-gl-adapter@1.2.1...terra-draw-maplibre-gl-adapter@1.2.2) (2025-10-14)


### fix

* **terra-draw-maplibre-gl-adapter:** use hasImage to determine if marker is loaded (#684) ([](https://github.com/JamesLMilner/terra-draw/commit/936df1b37ae5149e24d3feb02410da322903f2da)), closes [#684](https://github.com/JamesLMilner/terra-draw/issues/684)

## [1.2.1](https://github.com/JamesLMilner/terra-draw/compare/terra-draw-maplibre-gl-adapter@1.2.0...terra-draw-maplibre-gl-adapter@1.2.1) (2025-10-13)


### fix

* **terra-draw-maplibre-gl-adapter:** fix raised issue with multiple markers (#681) ([](https://github.com/JamesLMilner/terra-draw/commit/5d86fe89cd8a517a5cc66be53c8b4c1eb2153ea3)), closes [#681](https://github.com/JamesLMilner/terra-draw/issues/681)

## [1.2.0](https://github.com/JamesLMilner/terra-draw/compare/terra-draw-maplibre-gl-adapter@1.1.2...terra-draw-maplibre-gl-adapter@1.2.0) (2025-10-12)


### fix

* **terra-draw-maplibre-gl-adapter:** ensure zIndex is set for all geometry types (#619) ([](https://github.com/JamesLMilner/terra-draw/commit/b34cee9d7eb5d70cc8dd73b13f31835627d2b3b3)), closes [#619](https://github.com/JamesLMilner/terra-draw/issues/619)
* **terra-draw-maplibre-gl-adapter:** remove unused scaling for markers (#679) ([](https://github.com/JamesLMilner/terra-draw/commit/504276ad5a9af20418c83be2b3f8ebe17184f40c)), closes [#679](https://github.com/JamesLMilner/terra-draw/issues/679)


### feat

* **terra-draw-maplibre-gl-adapter:** add support for markers (#674) ([](https://github.com/JamesLMilner/terra-draw/commit/8aebe3b9ec3e2b42bb6b5b18617d6d755a950435)), closes [#674](https://github.com/JamesLMilner/terra-draw/issues/674)

## [1.1.2](https://github.com/JamesLMilner/terra-draw/compare/terra-draw-maplibre-gl-adapter@1.1.1...terra-draw-maplibre-gl-adapter@1.1.2) (2025-08-05)


### fix

* **terra-draw-maplibre-gl-adapter:** add prefixId argument in constructor to change layer prefix (#578) ([](https://github.com/JamesLMilner/terra-draw/commit/21e225f74f4c15822a51f5b779e132e22c36a651)), closes [#578](https://github.com/JamesLMilner/terra-draw/issues/578)

## [1.1.1](https://github.com/JamesLMilner/terra-draw/compare/terra-draw-maplibre-gl-adapter@1.1.0...terra-draw-maplibre-gl-adapter@1.1.1) (2025-06-08)


### fix

* **terra-draw-maplibre-gl-adapter:** ensure adapter is registered on next rAF callback (#571) ([](https://github.com/JamesLMilner/terra-draw/commit/1b3a84e8e4974f84b72e6ba15aea863aa4e9dc14)), closes [#571](https://github.com/JamesLMilner/terra-draw/issues/571)

## [1.1.0](https://github.com/JamesLMilner/terra-draw/compare/terra-draw-maplibre-gl-adapter@1.0.3...terra-draw-maplibre-gl-adapter@1.1.0) (2025-05-06)


### fix

* **terra-draw-maplibre-gl-adapter:** fix clear and unregister methods (#540) ([](https://github.com/JamesLMilner/terra-draw/commit/53ba278b40c10b476587029dd82aa8a590bcec68)), closes [#540](https://github.com/JamesLMilner/terra-draw/issues/540)


### chore

* **terra-draw-maplibre-gl-adapter:** use sort-key rather than extra point layer ordering (#539) ([](https://github.com/JamesLMilner/terra-draw/commit/e15b6a2f093e18feea97a869a4db41121ab6d524)), closes [#539](https://github.com/JamesLMilner/terra-draw/issues/539)


### feat

* **terra-draw-maplibre-gl-adapter:** add renderBelowLayerId option to control render order (#532) ([](https://github.com/JamesLMilner/terra-draw/commit/46e446651f716cb5582c37e72dc74b63c34587f1)), closes [#532](https://github.com/JamesLMilner/terra-draw/issues/532)

## [1.0.3](https://github.com/JamesLMilner/terra-draw/compare/terra-draw-maplibre-gl-adapter@1.0.2...terra-draw-maplibre-gl-adapter@1.0.3) (2025-04-03)


### fix

* **terra-draw-maplibre-gl-adapter:** better handle zindexes to support layered points (#515) ([](https://github.com/JamesLMilner/terra-draw/commit/18e62883db2e60b53e2f4a9c2568a6ee6a194bea)), closes [#515](https://github.com/JamesLMilner/terra-draw/issues/515)
* **terra-draw-maplibre-gl-adapter:** ensure lower point layer is cleaned up correctly (#523) ([](https://github.com/JamesLMilner/terra-draw/commit/0652adf730439b8735651a735eea46ad12c99a06)), closes [#523](https://github.com/JamesLMilner/terra-draw/issues/523)

## [1.0.2](https://github.com/JamesLMilner/terra-draw/compare/terra-draw-maplibre-gl-adapter@1.0.1...terra-draw-maplibre-gl-adapter@1.0.2) (2025-03-19)


### fix

* **terra-draw-maplibre-gl-adapter:** respect dragRotate and dragPan settings at initialisation (#504) ([](https://github.com/JamesLMilner/terra-draw/commit/fedcea7281843928744f1ea78d8f2e942b9878c6)), closes [#504](https://github.com/JamesLMilner/terra-draw/issues/504)


### chore

* **terra-draw-maplibre-gl-adapter:** fix typo in README (#424) ([](https://github.com/JamesLMilner/terra-draw/commit/374c779dd701de5c41ff2decba0152b8f8f78791)), closes [#424](https://github.com/JamesLMilner/terra-draw/issues/424)

## [1.0.1](https://github.com/JamesLMilner/terra-draw/compare/terra-draw-maplibre-gl-adapter@1.0.0...terra-draw-maplibre-gl-adapter@1.0.1) (2025-01-13)


### fix

* **terra-draw-maplibre-gl-adapter:** ensure the README has correct links on npm (#419) ([](https://github.com/JamesLMilner/terra-draw/commit/ccaa50632d6e954389111bbe63fee79bdb7f6a06)), closes [#419](https://github.com/JamesLMilner/terra-draw/issues/419)

## 1.0.0 (2025-01-12)


### ⚠ BREAKING CHANGE

* **terra-draw-maplibre-gl-adapter:** breaking change commit to allow adapter to v1.0.0 (#405)

### feat

* **terra-draw-maplibre-gl-adapter:** breaking change commit to allow adapter to v1.0.0 (#405) ([](https://github.com/JamesLMilner/terra-draw/commit/5a0cd54196a2a208b79c18755ec99891bee4e173)), closes [#405](https://github.com/JamesLMilner/terra-draw/issues/405)
