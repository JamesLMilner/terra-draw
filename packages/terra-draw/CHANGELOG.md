# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [1.25.0](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.24.2...terra-draw@1.25.0) (2026-02-18)


### chore

* **terra-draw:** add storybook story for smoothing in freehand mode (#821) ([](https://github.com/JamesLMilner/terra-draw/commit/9ebea41ee2019a3f39569d76e9015608ad5e94ca)), closes [#821](https://github.com/JamesLMilner/terra-draw/issues/821)
* **terra-draw:** add way to disable coverage threshold when developing locally (#816) ([](https://github.com/JamesLMilner/terra-draw/commit/75fdfde7ba5289fbfc05f2f2f876c088ad155510)), closes [#816](https://github.com/JamesLMilner/terra-draw/issues/816)
* **terra-draw:** bump jest to version 30 (#817) ([](https://github.com/JamesLMilner/terra-draw/commit/c4d3a64146e867a61e1233041aca19739599be7d)), closes [#817](https://github.com/JamesLMilner/terra-draw/issues/817)
* **terra-draw:** enable trusted publishing on all packages (#813) ([](https://github.com/JamesLMilner/terra-draw/commit/2081e01e6a45113a1f7296184d6166a17d2df7c7)), closes [#813](https://github.com/JamesLMilner/terra-draw/issues/813)
* **terra-draw:** skip testing in dist folders (#815) ([](https://github.com/JamesLMilner/terra-draw/commit/9c1726c56fee1b5b060d34190be34810c4accf7d)), closes [#815](https://github.com/JamesLMilner/terra-draw/issues/815)


### feat

* **terra-draw:** allow multiple select modes concurrently (#818) ([](https://github.com/JamesLMilner/terra-draw/commit/e1325935120bc7170f9b4e92d50debd01eab33c6)), closes [#818](https://github.com/JamesLMilner/terra-draw/issues/818)
* **terra-draw:** smoothing option for freehand (#820) ([](https://github.com/JamesLMilner/terra-draw/commit/c66f679aeaefe66caf36f3ef4d1664f561e772d9)), closes [#820](https://github.com/JamesLMilner/terra-draw/issues/820)
* **terra-draw:** support draw interactions for freehand mode (#819) ([](https://github.com/JamesLMilner/terra-draw/commit/51941298f6ab95d53fac2808aff26f4945b76094)), closes [#819](https://github.com/JamesLMilner/terra-draw/issues/819)

## [1.24.2](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.24.1...terra-draw@1.24.2) (2026-02-11)


### chore

* **terra-draw:** use OIDC Trusted Publishing (#812) ([](https://github.com/JamesLMilner/terra-draw/commit/b46f9166602c820dc50d49f3be7dc124035acd00)), closes [#812](https://github.com/JamesLMilner/terra-draw/issues/812)

## [1.24.1](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.24.0...terra-draw@1.24.1) (2026-02-10)


### fix

* **terra-draw:** assure consistent mouse move and click/drag behavior for midpoints (#807) ([](https://github.com/JamesLMilner/terra-draw/commit/aad8bd3da63cab7502f9dd1c7e8c7dc2901e6ef0)), closes [#807](https://github.com/JamesLMilner/terra-draw/issues/807)
* **terra-draw:** ensure cursor near midpoint and actual insertion behaviours match (#805) ([](https://github.com/JamesLMilner/terra-draw/commit/338c2560e65b5699ecf49917cc16b2b82ec7915b)), closes [#805](https://github.com/JamesLMilner/terra-draw/issues/805)
* **terra-draw:** ensure midpoint events do not always take priority in select mode (#810) ([](https://github.com/JamesLMilner/terra-draw/commit/808e3d3fa58fd34025e3504cdd0715cd674fb8bf)), closes [#810](https://github.com/JamesLMilner/terra-draw/issues/810)

## [1.24.0](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.23.3...terra-draw@1.24.0) (2026-02-01)


### chore

* **terra-draw:** fix npm audit high rated issues (#801) ([](https://github.com/JamesLMilner/terra-draw/commit/fdb0716373b4c16f243fc3a1c1fb365eb0f4146d)), closes [#801](https://github.com/JamesLMilner/terra-draw/issues/801)
* **terra-draw:** improve the opacity story example for in the storybook package (#802) ([](https://github.com/JamesLMilner/terra-draw/commit/af97f567958dea020f8308e561c28180f2bd9708)), closes [#802](https://github.com/JamesLMilner/terra-draw/issues/802)
* **terra-draw:** update github action versions to v6 for checkout and setup-node (#804) ([](https://github.com/JamesLMilner/terra-draw/commit/41a153a91c4dc745a0b3bb8d153af4dd38acd523)), closes [#804](https://github.com/JamesLMilner/terra-draw/issues/804)
* **terra-draw:** use Node v24 and npm 11 where possible (#803) ([](https://github.com/JamesLMilner/terra-draw/commit/38a7c6fe4bea3b7ad363bf351d29ca92ecb624b1)), closes [#803](https://github.com/JamesLMilner/terra-draw/issues/803)


### feat

* **terra-draw:** add support for point and linestring opacity (#785) ([](https://github.com/JamesLMilner/terra-draw/commit/5ecccd60780f84a9a67e0a7c44c4ac124c6abbc7)), closes [#785](https://github.com/JamesLMilner/terra-draw/issues/785)
* **terra-draw:** add support from polygon outline opacity configuration (#794) ([](https://github.com/JamesLMilner/terra-draw/commit/2b2a711dfabeb2e159cafecd6e0b94f359b5254c)), closes [#794](https://github.com/JamesLMilner/terra-draw/issues/794)

## [1.23.3](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.23.2...terra-draw@1.23.3) (2026-01-31)


### fix

* **terra-draw:** ensure resizable updates coordinate and midpoints correctly (#793) ([](https://github.com/JamesLMilner/terra-draw/commit/e7f8cfb2966bc18b45775035d4724f31e3282c6e)), closes [#793](https://github.com/JamesLMilner/terra-draw/issues/793)

## [1.23.2](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.23.1...terra-draw@1.23.2) (2026-01-30)


### fix

* **terra-draw:** ensure points do not set marker property to true (#783) ([](https://github.com/JamesLMilner/terra-draw/commit/983539f1803d11da133a0757bcdda7a5f6374385)), closes [#783](https://github.com/JamesLMilner/terra-draw/issues/783)


### docs

* **terra-draw:** fix the adapter links in terra-draw package README.md (#779) ([](https://github.com/JamesLMilner/terra-draw/commit/dab83f2cb95c43165bf57c4c9bb49c01c1251dd3)), closes [#779](https://github.com/JamesLMilner/terra-draw/issues/779)
* **terra-draw:** update the links to the adapter class documentation (#776) ([](https://github.com/JamesLMilner/terra-draw/commit/273f86d7fe6371ea757f34cad4cc7bd80b0544bb)), closes [#776](https://github.com/JamesLMilner/terra-draw/issues/776)

## [1.23.1](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.23.0...terra-draw@1.23.1) (2026-01-17)


### fix

* **terra-draw:** ensure snapping points are updated as expected in polygon mode when right clicking (#774) ([](https://github.com/JamesLMilner/terra-draw/commit/634fea999087ad3efae14494b7f938eb53a3a422)), closes [#774](https://github.com/JamesLMilner/terra-draw/issues/774)

## [1.23.0](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.22.0...terra-draw@1.23.0) (2026-01-15)


### feat

* **terra-draw:** add finishOnNthCoordinate as option to linestring mode (#772) ([](https://github.com/JamesLMilner/terra-draw/commit/e7d87395da4961d02e5a67de98f74f1ac4bf36c0)), closes [#772](https://github.com/JamesLMilner/terra-draw/issues/772)
* **terra-draw:** add linestring support for coordinate points (#771) ([](https://github.com/JamesLMilner/terra-draw/commit/351ea3ae650c2b8cd485696019c722d91a4af74f)), closes [#771](https://github.com/JamesLMilner/terra-draw/issues/771)


### fix

* **terra-draw:** fix coordinate points not updating correctly with polygon editable argument (#770) ([](https://github.com/JamesLMilner/terra-draw/commit/4ffeedd7596f2450b0cbbfd004e7e521ad632509)), closes [#770](https://github.com/JamesLMilner/terra-draw/issues/770)

## [1.22.0](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.21.4...terra-draw@1.22.0) (2026-01-09)


### feat

* **terra-draw:** allow the number of segments in circle mode to be configurable (#768) ([](https://github.com/JamesLMilner/terra-draw/commit/c12b0108b706e796fd27614e2c04a256ca0b608d)), closes [#768](https://github.com/JamesLMilner/terra-draw/issues/768)

## [1.21.4](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.21.3...terra-draw@1.21.4) (2026-01-08)


### fix

* **terra-draw:** fix midpoint not being update correctly on coordinate drag (#767) ([](https://github.com/JamesLMilner/terra-draw/commit/20d52af8946277d29f6a3ff0b33d3520d3859a6a)), closes [#767](https://github.com/JamesLMilner/terra-draw/issues/767)

## [1.21.3](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.21.2...terra-draw@1.21.3) (2026-01-07)


### fix

* **terra-draw:** ensure that setMode can be called in onFinish (#766) ([](https://github.com/JamesLMilner/terra-draw/commit/6819b1c406883016c8b8123ac04b38e8538d9503)), closes [#766](https://github.com/JamesLMilner/terra-draw/issues/766)

## [1.21.2](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.21.1...terra-draw@1.21.2) (2026-01-01)


### fix

* **terra-draw:** fix feature being deleted and then stop being called in on finish (#763) ([](https://github.com/JamesLMilner/terra-draw/commit/c9b5e4b70362839c4316e7c576e98253a85fcd7f)), closes [#763](https://github.com/JamesLMilner/terra-draw/issues/763)

## [1.21.1](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.21.0...terra-draw@1.21.1) (2025-12-31)


### fix

* **terra-draw:** call cleanup when a currently drawn feature is deleted (#760) ([](https://github.com/JamesLMilner/terra-draw/commit/771d0567125a27d471e9bfa397f5d2ddf263e5d4)), closes [#760](https://github.com/JamesLMilner/terra-draw/issues/760)
* **terra-draw:** use Array.from for Sets instead of spreading due to microbundle (#757) ([](https://github.com/JamesLMilner/terra-draw/commit/dd4b1091dd43302f6b7409b25cf5e96296549ea9)), closes [#757](https://github.com/JamesLMilner/terra-draw/issues/757)

## [1.21.0](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.20.0...terra-draw@1.21.0) (2025-12-26)


### test

* **terra-draw:** add more unit tests around custom mode names (#753) ([](https://github.com/JamesLMilner/terra-draw/commit/05fe176e4dc420db64578b9471f3d00908559fde)), closes [#753](https://github.com/JamesLMilner/terra-draw/issues/753)
* **terra-draw:** add some additional unit tests for coordinate points (#755) ([](https://github.com/JamesLMilner/terra-draw/commit/b49fbbb9ca860a431ad4af37aae47a94b830679e)), closes [#755](https://github.com/JamesLMilner/terra-draw/issues/755)


### fix

* **terra-draw:** ensure that rectangle mode cleanup can handle deleted geometries (#754) ([](https://github.com/JamesLMilner/terra-draw/commit/dbcd5e53882f85e182927fd3a610f0b9906f24d7)), closes [#754](https://github.com/JamesLMilner/terra-draw/issues/754)
* **terra-draw:** ensure that toLine and toCoordinate snapping works correctly in linestring mode (#740) ([](https://github.com/JamesLMilner/terra-draw/commit/c6ed5c2cb943dae70bc5b6cde4a59e73ec788c54)), closes [#740](https://github.com/JamesLMilner/terra-draw/issues/740)


### chore

* **terra-draw:** fix mutate behavior tests (#751) ([](https://github.com/JamesLMilner/terra-draw/commit/e42c4c318a7d2a563dfcc7239f03a87e9a03722e)), closes [#751](https://github.com/JamesLMilner/terra-draw/issues/751)


### refactor

* **terra-draw:** add a centralised way to manipulate geometries (#718) ([](https://github.com/JamesLMilner/terra-draw/commit/971d307727911d14dc111934f9eb5b6096117398)), closes [#718](https://github.com/JamesLMilner/terra-draw/issues/718)
* **terra-draw:** rework behaviors to use mutate feature behavior (#750) ([](https://github.com/JamesLMilner/terra-draw/commit/dd1c5a2ada0aa5b0aba68d773567330015e81459)), closes [#750](https://github.com/JamesLMilner/terra-draw/issues/750)
* **terra-draw:** use MutateBehavior in select mode (#747) ([](https://github.com/JamesLMilner/terra-draw/commit/73c1ad9298bcb06b6e0aeaccf4d2c053cb6b6cb0)), closes [#747](https://github.com/JamesLMilner/terra-draw/issues/747)
* **terra-draw:** use MutateFeatureBehavior for circle and rectangle modes (#738) ([](https://github.com/JamesLMilner/terra-draw/commit/9fc1bfd5c73e7b61a7fd26d888173828c1a12594)), closes [#738](https://github.com/JamesLMilner/terra-draw/issues/738)
* **terra-draw:** use MutateFeatureBehavior in angled rectangle mode (#741) ([](https://github.com/JamesLMilner/terra-draw/commit/7d8598fce6947da44334b1a0451fe9a2082bb441)), closes [#741](https://github.com/JamesLMilner/terra-draw/issues/741)
* **terra-draw:** use MutateFeatureBehavior in freehand and freehand-linestring modes (#744) ([](https://github.com/JamesLMilner/terra-draw/commit/fe2ce9ea748266ed509094d5aa8fc1a456d6e29f)), closes [#744](https://github.com/JamesLMilner/terra-draw/issues/744)
* **terra-draw:** use MutateFeatureBehavior in point and marker modes (#743) ([](https://github.com/JamesLMilner/terra-draw/commit/aa8d5d4d7ca757813b64c88eaef9847681549b89)), closes [#743](https://github.com/JamesLMilner/terra-draw/issues/743)
* **terra-draw:** use MutateFeatureBehavior in sector and sensor modes (#746) ([](https://github.com/JamesLMilner/terra-draw/commit/dc1fb8c6e2b7260515450da0d8f38a9b2930b778)), closes [#746](https://github.com/JamesLMilner/terra-draw/issues/746) [#744](https://github.com/JamesLMilner/terra-draw/issues/744)


### feat

* **terra-draw:** optional click-and-drag support for TerraDrawCircleMode (#668) (#745) ([](https://github.com/JamesLMilner/terra-draw/commit/e7144e97e919b268a1dc7b0f878276a8a36e5236)), closes [#668](https://github.com/JamesLMilner/terra-draw/issues/668) [#745](https://github.com/JamesLMilner/terra-draw/issues/745) [#744](https://github.com/JamesLMilner/terra-draw/issues/744) [#668](https://github.com/JamesLMilner/terra-draw/issues/668)
* **terra-draw:** provide event type to getMapEventElement (#733) ([](https://github.com/JamesLMilner/terra-draw/commit/25cc42c67adee74d7a4f487bada4b03a49f457ad)), closes [#733](https://github.com/JamesLMilner/terra-draw/issues/733)

## [1.20.0](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.19.0...terra-draw@1.20.0) (2025-11-29)


### chore

* **terra-draw:** add sponsorship page (#722) ([](https://github.com/JamesLMilner/terra-draw/commit/5534a93436af45bbf11cf7a9a61423e2d62e0968)), closes [#722](https://github.com/JamesLMilner/terra-draw/issues/722)
* **terra-draw:** use vite instead of webpack (#717) ([](https://github.com/JamesLMilner/terra-draw/commit/81cd10bd22ba164e900a7d46e73b911da0b1ca20)), closes [#717](https://github.com/JamesLMilner/terra-draw/issues/717)


### docs

* **terra-draw:** add Rectangle draw interaction examples to Storybook (#668) (#721) ([](https://github.com/JamesLMilner/terra-draw/commit/39c5feb8f4d8da8eb6aaa83b1da68dc72d3c8e94)), closes [#668](https://github.com/JamesLMilner/terra-draw/issues/668) [#721](https://github.com/JamesLMilner/terra-draw/issues/721)
* **terra-draw:** document marker property requirement for marker icons (#712) ([](https://github.com/JamesLMilner/terra-draw/commit/576d15597155aad3e2e88588f5d76d4ad38429c1)), closes [#712](https://github.com/JamesLMilner/terra-draw/issues/712)


### feat

* **terra-draw:** add context to determine if update is to properties or geometry (#708) ([](https://github.com/JamesLMilner/terra-draw/commit/5f3a2e1039b3cffaf78fa80e5ddaa3dd6741644e)), closes [#708](https://github.com/JamesLMilner/terra-draw/issues/708)
* **terra-draw:** optional click-and-drag support for TerraDrawRectangleMode (#668) (#700) ([](https://github.com/JamesLMilner/terra-draw/commit/58b9fad191debc6b499b2a3da503c3a091af5f13)), closes [#668](https://github.com/JamesLMilner/terra-draw/issues/668) [#700](https://github.com/JamesLMilner/terra-draw/issues/700) [#668](https://github.com/JamesLMilner/terra-draw/issues/668)


### fix

* **terra-draw:** avoid excessive change events and duplicate ids from property changes (#707) ([](https://github.com/JamesLMilner/terra-draw/commit/e5323b02366105b7660e37d00fa780405215b2d1)), closes [#707](https://github.com/JamesLMilner/terra-draw/issues/707)
* **terra-draw:** trigger finish event when inserting or deleting coordinate in select mode (#709) ([](https://github.com/JamesLMilner/terra-draw/commit/b69c2c93e1c3585a63539bd63fcc742911fcccb7)), closes [#709](https://github.com/JamesLMilner/terra-draw/issues/709)

## [1.19.0](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.18.1...terra-draw@1.19.0) (2025-11-09)


### docs

* **terra-draw:** added required args to OpenLayers Adapter docs (#690) ([](https://github.com/JamesLMilner/terra-draw/commit/35caea04274fc1fcb35051ac52b7e644244a5f5b)), closes [#690](https://github.com/JamesLMilner/terra-draw/issues/690)
* **terra-draw:** fix console log syntax error in 4.MODES.md  ([](https://github.com/JamesLMilner/terra-draw/commit/a3d87c489f2404d5b2589644b7185e5c07bbdd62))
* **terra-draw:** update the API docs (#704) ([](https://github.com/JamesLMilner/terra-draw/commit/eebed8227352deefa766333d8f757d3707f09c6e)), closes [#704](https://github.com/JamesLMilner/terra-draw/issues/704)


### chore

* **terra-draw:** use a centralised type for updateOptions argument (#705) ([](https://github.com/JamesLMilner/terra-draw/commit/51d004b845db6edf9068b5c8da9c442290c2f191)), closes [#705](https://github.com/JamesLMilner/terra-draw/issues/705)


### feat

* **terra-draw:** allow multiple instances of a mode via modeName constructor property (#701) ([](https://github.com/JamesLMilner/terra-draw/commit/855413c450b08ec66ed77e66d2a4eab44793f33d)), closes [#701](https://github.com/JamesLMilner/terra-draw/issues/701)

## [1.18.1](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.18.0...terra-draw@1.18.1) (2025-10-20)


### fix

* **terra-draw:** add default marker url for marker mode (#696) ([](https://github.com/JamesLMilner/terra-draw/commit/b8ae458cb281b20a159b7b9dec7ba09fe34fd4d5)), closes [#696](https://github.com/JamesLMilner/terra-draw/issues/696)
* **terra-draw:** ensure default marker url path is correct (#697) ([](https://github.com/JamesLMilner/terra-draw/commit/dc407860fdb3bf08308a39a675f981ed3170d0f1)), closes [#697](https://github.com/JamesLMilner/terra-draw/issues/697)
* **terra-draw:** ensure markers are styleable in select mode (#695) ([](https://github.com/JamesLMilner/terra-draw/commit/bd6b7f56a1deeaf9affc24d937a8a885fb621a37)), closes [#695](https://github.com/JamesLMilner/terra-draw/issues/695)


### docs

* **terra-draw:** document supported image formats for markers (#686) ([](https://github.com/JamesLMilner/terra-draw/commit/19c8552950d42b54c6fb94190878bdc48bfc06c3)), closes [#686](https://github.com/JamesLMilner/terra-draw/issues/686)

## [1.18.0](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.17.0...terra-draw@1.18.0) (2025-10-14)


### feat

* **terra-draw:** provide ignoreMismatchedPointerEvents option in adapters (#685) ([](https://github.com/JamesLMilner/terra-draw/commit/ace08dc48e54796691bead4a4a3ad51db2dabaee)), closes [#685](https://github.com/JamesLMilner/terra-draw/issues/685)

## [1.17.0](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.16.0...terra-draw@1.17.0) (2025-10-12)


### docs

* **terra-draw:** add story to Storybook for new marker mode (#677) ([](https://github.com/JamesLMilner/terra-draw/commit/b892eb68f69bda79723e12cdf92fc6caa3cbd0ea)), closes [#677](https://github.com/JamesLMilner/terra-draw/issues/677)
* **terra-draw:** update guide docs to reflect new features (#669) ([](https://github.com/JamesLMilner/terra-draw/commit/f37d4db57a124521924a9e71ac79e7b2a217d0f8)), closes [#669](https://github.com/JamesLMilner/terra-draw/issues/669)
* **terra-draw:** update outdated link in 4.MODES.md (#666) ([](https://github.com/JamesLMilner/terra-draw/commit/4cadc66ce4e566e0d98d8e856e256c08f974c477)), closes [#666](https://github.com/JamesLMilner/terra-draw/issues/666)


### feat

* **terra-draw:** add initial support for markers and a built in marker mode (#670) ([](https://github.com/JamesLMilner/terra-draw/commit/dff272dfbea16467ad23daa28456adc23e40736c)), closes [#670](https://github.com/JamesLMilner/terra-draw/issues/670)

## [1.16.0](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.15.0...terra-draw@1.16.0) (2025-10-06)


### fix

* **terra-draw:** ensure addClosestCoordinateInfoToProperties does not break polygon coordinates (#664) ([](https://github.com/JamesLMilner/terra-draw/commit/f71f00791b8c2facf364d9ba978ea15ac6440521)), closes [#664](https://github.com/JamesLMilner/terra-draw/issues/664)
* **terra-draw:** ensure precision is respected for TerraDrawAngledRectangleMode (#661) ([](https://github.com/JamesLMilner/terra-draw/commit/0d969b1341db927f3a0890134cb08139e384f668)), closes [#661](https://github.com/JamesLMilner/terra-draw/issues/661)


### chore

* **terra-draw:** add benchmarking for the public Terra Draw API (#663) ([](https://github.com/JamesLMilner/terra-draw/commit/d19f03486136ac6b1e55490c949c0a22a77600a4)), closes [#663](https://github.com/JamesLMilner/terra-draw/issues/663)


### test

* **terra-draw:** add unit tests for ignoreSnappingPoints (#660) ([](https://github.com/JamesLMilner/terra-draw/commit/965fc625007e0451c07cda3b00a64d740f4a5cb0)), closes [#660](https://github.com/JamesLMilner/terra-draw/issues/660)


### feat

* **terra-draw:** provide a option for getFeaturesAt methods to ignore snapping points ([](https://github.com/JamesLMilner/terra-draw/commit/6dce5e70c0a4c064b4ebd8b70824fdea69db69fe))

## [1.15.0](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.14.0...terra-draw@1.15.0) (2025-09-17)


### fix

* **terra-draw:** ensure afterFeatureAdded is called after onChange (#652) ([](https://github.com/JamesLMilner/terra-draw/commit/2f3e1ec5d8b0347e70cb7ae887e585acb71dadfd)), closes [#652](https://github.com/JamesLMilner/terra-draw/issues/652)


### feat

* **terra-draw:** allow returning of closest coordinate information for getFeaturesAtLngLat (#645) ([](https://github.com/JamesLMilner/terra-draw/commit/b3b60f67710be38f5d882393d3e2035ec58d21d7)), closes [#645](https://github.com/JamesLMilner/terra-draw/issues/645)


### docs

* **terra-draw:** add editable and pointerDistance documentation (#643) ([](https://github.com/JamesLMilner/terra-draw/commit/b237ada776e62134098b90cbba5b905e4e2e7929)), closes [#643](https://github.com/JamesLMilner/terra-draw/issues/643)

## [1.14.0](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.13.0...terra-draw@1.14.0) (2025-09-07)


### feat

* **terra-draw:** allow setting of custom properties with updateFeatureProperties (#629) ([](https://github.com/JamesLMilner/terra-draw/commit/7f5286e1edab98549cfa5bb7870a5286573032b6)), closes [#629](https://github.com/JamesLMilner/terra-draw/issues/629)


### chore

* **terra-draw:** ensure badge colors in README are consistent (#636) ([](https://github.com/JamesLMilner/terra-draw/commit/216b1fbe70f4eadf8b19d1729575200a98352704)), closes [#636](https://github.com/JamesLMilner/terra-draw/issues/636)
* **terra-draw:** update badges in the README, add sponsors link (#635) ([](https://github.com/JamesLMilner/terra-draw/commit/8a81313cfbd9cbf3f378f13a6743472d5882792f)), closes [#635](https://github.com/JamesLMilner/terra-draw/issues/635)

## [1.13.0](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.12.0...terra-draw@1.13.0) (2025-08-27)


### fix

* **terra-draw:** ensure closing points for linestring mode are styleable (#634) ([](https://github.com/JamesLMilner/terra-draw/commit/bbc80a47f2cbe215f430460ff4c8f88ce2a3bcb1)), closes [#634](https://github.com/JamesLMilner/terra-draw/issues/634)
* **terra-draw:** ensure polygon coordinate points respect right hand rule (#612) ([](https://github.com/JamesLMilner/terra-draw/commit/2b90c08489c6c03d77442fc202ee41e78121f8db)), closes [#612](https://github.com/JamesLMilner/terra-draw/issues/612)


### feat

* **terra-draw:** provide properties in polygon mode for determining current coordinate count (#620) ([](https://github.com/JamesLMilner/terra-draw/commit/e4c57f21b1d48ad1f2fb90c02b36eb3a9ceff125)), closes [#620](https://github.com/JamesLMilner/terra-draw/issues/620)


### docs

* **terra-draw:** add Select mode stories to Storybook (#605) ([](https://github.com/JamesLMilner/terra-draw/commit/00ea6141b5f3f73892a1493f818c6d5b1c12d51e)), closes [#605](https://github.com/JamesLMilner/terra-draw/issues/605)
* **terra-draw:** add Storybook examples for zIndexing (#616) ([](https://github.com/JamesLMilner/terra-draw/commit/36ee0ac19f1bca888fd530610478d5887b5dc93e)), closes [#616](https://github.com/JamesLMilner/terra-draw/issues/616)


### chore

* **terra-draw:** add smoke tests for Storybook examples (#614) ([](https://github.com/JamesLMilner/terra-draw/commit/76af791a2e6705c2254ad1c4aa22d9ff4ffe564e)), closes [#614](https://github.com/JamesLMilner/terra-draw/issues/614)

## [1.12.0](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.11.0...terra-draw@1.12.0) (2025-08-04)


### feat

* **terra-draw:** add Storybook to the repository and remove development folder (#597) ([](https://github.com/JamesLMilner/terra-draw/commit/b5ba9a08c895f4c6da933158d6064b342c19c6a7)), closes [#597](https://github.com/JamesLMilner/terra-draw/issues/597)
* **terra-draw:** add transformFeatureGeometry to the API (#603) ([](https://github.com/JamesLMilner/terra-draw/commit/1e76e095e81caab2b7898be7d4b87eab21e6591d)), closes [#603](https://github.com/JamesLMilner/terra-draw/issues/603)


### docs

* **terra-draw:** add additional examples to Storybook (#602) ([](https://github.com/JamesLMilner/terra-draw/commit/2ebd32e9885a2183d7699dec90c8dd52c518252c)), closes [#602](https://github.com/JamesLMilner/terra-draw/issues/602)
* **terra-draw:** update documentation to make Storybook usage clearer (#601) ([](https://github.com/JamesLMilner/terra-draw/commit/66a3c47fd256cb2fc9a3f1c692fe428bd2b8c90b)), closes [#601](https://github.com/JamesLMilner/terra-draw/issues/601)


### fix

* **terra-draw:** export Terra Draw types using type keyword when exporting (#598) ([](https://github.com/JamesLMilner/terra-draw/commit/9e7f49826c1152e1ebdd9a932569a69ceeac5f70)), closes [#598](https://github.com/JamesLMilner/terra-draw/issues/598)

## [1.11.0](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.10.0...terra-draw@1.11.0) (2025-07-24)


### feat

* **terra-draw:** add TerraDrawFreehandLineStringMode as a built in mode (#595) ([](https://github.com/JamesLMilner/terra-draw/commit/9ff9025a16eb264347869b9197bfad95961e8f64)), closes [#595](https://github.com/JamesLMilner/terra-draw/issues/595)

## [1.10.0](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.9.1...terra-draw@1.10.0) (2025-07-21)


### feat

* **terra-draw:** add updateFeatureGeometry to the API (#560) ([](https://github.com/JamesLMilner/terra-draw/commit/acb2e684a90b11b41fc02df891eed296e931d0cd)), closes [#560](https://github.com/JamesLMilner/terra-draw/issues/560)

## [1.9.1](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.9.0...terra-draw@1.9.1) (2025-07-01)


### fix

* **terra-draw:** avoid allowing editing currently drawn polygon in polygon mode (#582) ([](https://github.com/JamesLMilner/terra-draw/commit/fa46b021161c4848fb2baede9c9e7c31d636ea3f)), closes [#582](https://github.com/JamesLMilner/terra-draw/issues/582)
* **terra-draw:** ensure includePolygonsWithinPointerDistance works correctly (#583) ([](https://github.com/JamesLMilner/terra-draw/commit/1c481c4fbebf23c01ebc73e3fae8e3b1d168d0b5)), closes [#583](https://github.com/JamesLMilner/terra-draw/issues/583)
* **terra-draw:** ensure snapping respects the configured coordinate precision (#586) ([](https://github.com/JamesLMilner/terra-draw/commit/9d8f3802d08b779281cc134d0128b0d0bbe61f44)), closes [#586](https://github.com/JamesLMilner/terra-draw/issues/586)

## [1.9.0](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.8.0...terra-draw@1.9.0) (2025-06-24)


### feat

* **terra-draw:** add property that is applied on features that are being drawn (#575) ([](https://github.com/JamesLMilner/terra-draw/commit/cddf7d82cb56492af427ec1f6dba839b99c5f86f)), closes [#575](https://github.com/JamesLMilner/terra-draw/issues/575)
* **terra-draw:** get nearby polygons with getFeaturesAtLngLat/getFeaturesAtPointerEvent (#576) ([](https://github.com/JamesLMilner/terra-draw/commit/ef363f60e014e2f84e2232545583d8c601c6e291)), closes [#576](https://github.com/JamesLMilner/terra-draw/issues/576)

## [1.8.0](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.7.0...terra-draw@1.8.0) (2025-06-12)


### feat

* **terra-draw:** unify snapping functionality across polygon, linestring and select modes (#565) ([](https://github.com/JamesLMilner/terra-draw/commit/59884159c971fcfbcf16475f0ae4fff8db8f5faa)), closes [#565](https://github.com/JamesLMilner/terra-draw/issues/565)

## [1.7.0](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.6.3...terra-draw@1.7.0) (2025-06-08)


### fix

* **terra-draw:** avoid calling register/unregister when state is already enabled/disabled (#570) ([](https://github.com/JamesLMilner/terra-draw/commit/83416ab966ac2b907692ea8639c15c0f2b1465bb)), closes [#570](https://github.com/JamesLMilner/terra-draw/issues/570)
* **terra-draw:** ensure coordinate points are cleaned up after delete (#566) ([](https://github.com/JamesLMilner/terra-draw/commit/0cf326891f11611643a1964ced6b1a23d2c6c20f)), closes [#566](https://github.com/JamesLMilner/terra-draw/issues/566)


### feat

* **terra-draw:** add getModeState to the Terra Draw API (#559) ([](https://github.com/JamesLMilner/terra-draw/commit/1fbcca103b23bfaa38bb3d24829bb9352236789d)), closes [#559](https://github.com/JamesLMilner/terra-draw/issues/559)
* **terra-draw:** add index property to coordinate points (#569) ([](https://github.com/JamesLMilner/terra-draw/commit/1f7395762981feee0f41ad8aec24cfbeb060142b)), closes [#569](https://github.com/JamesLMilner/terra-draw/issues/569)

## [1.6.3](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.6.2...terra-draw@1.6.3) (2025-06-01)


### fix

* **terra-draw:** ensure the initial click renders coordinate points when showCoordinatePoints true (#558) ([](https://github.com/JamesLMilner/terra-draw/commit/3b967f49262fc3577dc7a7d2eb855a3985461aa5)), closes [#558](https://github.com/JamesLMilner/terra-draw/issues/558)

## [1.6.2](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.6.1...terra-draw@1.6.2) (2025-05-20)


### fix

* **terra-draw:** resolve issue with scaling not tracking cursor correctly (#552) ([](https://github.com/JamesLMilner/terra-draw/commit/43868ef3827b6af8e79db8b1c623e59677a365ec)), closes [#552](https://github.com/JamesLMilner/terra-draw/issues/552)

## [1.6.1](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.6.0...terra-draw@1.6.1) (2025-05-19)


### fix

* **terra-draw:** improve rotating and scaling behaviours for geographically small geometries (#549) ([](https://github.com/JamesLMilner/terra-draw/commit/d1ec0e3b92a4fcdb46bcc71587b54264016ac969)), closes [#549](https://github.com/JamesLMilner/terra-draw/issues/549)


### docs

* **terra-draw:** ensure style.load event is wrapping MapLibre and Mapbox examples (#550) ([](https://github.com/JamesLMilner/terra-draw/commit/aa205f996558e936b043f4421275550e8d63e0ec)), closes [#550](https://github.com/JamesLMilner/terra-draw/issues/550)

## [1.6.0](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.5.0...terra-draw@1.6.0) (2025-05-15)


### docs

* **terra-draw:** add style-load event to guides for Mapbox/MapLibre (#537) ([](https://github.com/JamesLMilner/terra-draw/commit/6a233a9e5a65b41bb355421cab5d61cdb06739f0)), closes [#537](https://github.com/JamesLMilner/terra-draw/issues/537)
* **terra-draw:** do not mention reference specifics of how adapters clear up data (#541) ([](https://github.com/JamesLMilner/terra-draw/commit/391c4244d6817d4c88aa4e216fe0d80731ec672c)), closes [#541](https://github.com/JamesLMilner/terra-draw/issues/541)
* **terra-draw:** ensure README link to terra-draw-mapbox-gl-js-adapter is correct (#545) ([](https://github.com/JamesLMilner/terra-draw/commit/633bc49b6eca4d04c0d2ec94d32a0af2c109239d)), closes [#545](https://github.com/JamesLMilner/terra-draw/issues/545)
* **terra-draw:** fix package name of terra-draw-maplibre-gl-adapter in README (#542) ([](https://github.com/JamesLMilner/terra-draw/commit/0cac76120acfed3fdb6ddc02977d8c45003187b4)), closes [#542](https://github.com/JamesLMilner/terra-draw/issues/542)
* **terra-draw:** update a link in 4.MODES.md (#546) ([](https://github.com/JamesLMilner/terra-draw/commit/409a7c479ded7f4fc6dd80223e6febad43f71984)), closes [#546](https://github.com/JamesLMilner/terra-draw/issues/546)


### fix

* **terra-draw:** ensure draggability is not set to true whilst editing polygons (#544) ([](https://github.com/JamesLMilner/terra-draw/commit/0e36035f88d32af607ea2f2c4a5e2d048166264b)), closes [#544](https://github.com/JamesLMilner/terra-draw/issues/544)


### feat

* **terra-draw:** add a way to determine which feature a coordinate point relates to (#536) ([](https://github.com/JamesLMilner/terra-draw/commit/5eedd1158b664580bcfbd751a22bea06ac861f5d)), closes [#536](https://github.com/JamesLMilner/terra-draw/issues/536)
* **terra-draw:** allow coordinate deletions with contextmenu events (#538) ([](https://github.com/JamesLMilner/terra-draw/commit/acf0d339fbf00b1f84e53056d99c6f3362cdaf20)), closes [#538](https://github.com/JamesLMilner/terra-draw/issues/538)
* **terra-draw:** allow filtering of pointer events with a function or boolean (#543) ([](https://github.com/JamesLMilner/terra-draw/commit/faa2311470372318d9478d3c8701559d2aed6c70)), closes [#543](https://github.com/JamesLMilner/terra-draw/issues/543)


### chore

* **terra-draw:** use a constant for feature zIndexing (#531) ([](https://github.com/JamesLMilner/terra-draw/commit/d28591006fce8c240e0aa841006f43b7adf1b3c4)), closes [#531](https://github.com/JamesLMilner/terra-draw/issues/531)

## [1.5.0](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.4.3...terra-draw@1.5.0) (2025-04-21)


### feat

* **terra-draw:** add metadata object when onChange is called via the Terra Draw API (#530) ([](https://github.com/JamesLMilner/terra-draw/commit/19eb7633d450296aafa39c489fb355686f102ba2)), closes [#530](https://github.com/JamesLMilner/terra-draw/issues/530)

## [1.4.3](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.4.2...terra-draw@1.4.3) (2025-04-07)


### chore

* **terra-draw:** export additional types for easier typing and extension  (#524) ([](https://github.com/JamesLMilner/terra-draw/commit/1ad36d430376d571f645a3508c5893def528ccaf)), closes [#524](https://github.com/JamesLMilner/terra-draw/issues/524)

## [1.4.2](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.4.1...terra-draw@1.4.2) (2025-04-03)


### fix

* **terra-draw:** account for coordinate points potentially not existing (#522) ([](https://github.com/JamesLMilner/terra-draw/commit/a9729bce9fe61491a56a58d2a0c952d3df97149e)), closes [#522](https://github.com/JamesLMilner/terra-draw/issues/522)

## [1.4.1](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.4.0...terra-draw@1.4.1) (2025-04-02)


### fix

* **terra-draw:** ensure that coordinate, midpoints and selection points deleted on clean up (#521) ([](https://github.com/JamesLMilner/terra-draw/commit/d9506eb64798c83f860d0ec83c706ef6ec464e14)), closes [#521](https://github.com/JamesLMilner/terra-draw/issues/521)

## [1.4.0](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.3.1...terra-draw@1.4.0) (2025-03-26)


### feat

* **terra-draw:** add snappable as an option for dragging geometry coordinates in select mode (#519) ([](https://github.com/JamesLMilner/terra-draw/commit/6b9492aa3e073955dfcaf99f64e9be1e4a9d5f05)), closes [#519](https://github.com/JamesLMilner/terra-draw/issues/519)
* **terra-draw:** provide a way to render coordinate points for polygons (#516) ([](https://github.com/JamesLMilner/terra-draw/commit/e47cc414f26b685ebccac2f9c00ebf3b59170ea6)), closes [#516](https://github.com/JamesLMilner/terra-draw/issues/516)


### chore

* **terra-draw:** use a class to get better typings when setting up map/draw for the e2e tests (#518) ([](https://github.com/JamesLMilner/terra-draw/commit/69f4aab809c532d875afbec0200a5bf78a020c78)), closes [#518](https://github.com/JamesLMilner/terra-draw/issues/518)

## [1.3.1](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.3.0...terra-draw@1.3.1) (2025-03-25)


### fix

* **terra-draw:** edits made via the editable option now trigger a finish event (#508) ([](https://github.com/JamesLMilner/terra-draw/commit/e23a08237d66d9fba8d5f49f952b740247f2da73)), closes [#508](https://github.com/JamesLMilner/terra-draw/issues/508)

## [1.3.0](https://github.com/JamesLMilner/terra-draw/compare/terra-draw@1.2.0...terra-draw@1.3.0) (2025-03-16)


### fix

* **terra-draw:** added new ValidationReason if feature has excessive coordinate precision (#501) ([](https://github.com/JamesLMilner/terra-draw/commit/2d2c62bf2216a918de254c83551ea7e87ee431f5)), closes [#501](https://github.com/JamesLMilner/terra-draw/issues/501)
* **terra-draw:** ensure that editable only allows updating features in the current mode (#484) ([](https://github.com/JamesLMilner/terra-draw/commit/cd85181d288df79395a3476600d913c0d8706245)), closes [#484](https://github.com/JamesLMilner/terra-draw/issues/484)


### chore

* **terra-draw:** add a script that can bump all necessary packages (#487) ([](https://github.com/JamesLMilner/terra-draw/commit/3b6d3ea50601a01c561de24080dc237860d0598e)), closes [#487](https://github.com/JamesLMilner/terra-draw/issues/487)
* **terra-draw:** automatically update relevant package.json/package-lock.json on releases (#500) ([](https://github.com/JamesLMilner/terra-draw/commit/ccc34eb23ad0871e149a047bdbd4c249b18d7075)), closes [#500](https://github.com/JamesLMilner/terra-draw/issues/500)
* **terra-draw:** ensure e2e test package is using latest terra-draw-leaflet-adapter version (#498) ([](https://github.com/JamesLMilner/terra-draw/commit/ddd5f4eb8be43682ad359f4d1e4b64a9f09a0ca4)), closes [#498](https://github.com/JamesLMilner/terra-draw/issues/498)
* **terra-draw:** fix broken link on the Getting Started guide (#475) ([](https://github.com/JamesLMilner/terra-draw/commit/0a20718cdb89eec07eafd9789f78b6f828aae39f)), closes [#475](https://github.com/JamesLMilner/terra-draw/issues/475)
* **terra-draw:** fix build due to e2e package.json referencing terra-draw v1.1.0 (#478) ([](https://github.com/JamesLMilner/terra-draw/commit/ec0666f39cec0bb4cdf3f9ca0e29cdd161c86a59)), closes [#478](https://github.com/JamesLMilner/terra-draw/issues/478)
* **terra-draw:** update the e2e and development package terra-draw and adapter versions (#483) ([](https://github.com/JamesLMilner/terra-draw/commit/d84541bfbbfa66706d5ecb1430b914a0b649fec4)), closes [#483](https://github.com/JamesLMilner/terra-draw/issues/483)


### feat

* **terra-draw:** allow dragging of midpoints in select mode by passing a flag (#497) ([](https://github.com/JamesLMilner/terra-draw/commit/44af00d173ea9d911af3878add2df07adddd30ad)), closes [#497](https://github.com/JamesLMilner/terra-draw/issues/497)
* **terra-draw:** provide context object argument to toCustom callback in polygon mode (#489) ([](https://github.com/JamesLMilner/terra-draw/commit/f5d955563afd605dda95e9b6217fd9e5584c1dd5)), closes [#489](https://github.com/JamesLMilner/terra-draw/issues/489)


### docs

* **terra-draw:** add section on updateModeOptions to MODES guide (#491) ([](https://github.com/JamesLMilner/terra-draw/commit/8b3a20f60dc86ef282eebafb2f061ab387d56ae2)), closes [#491](https://github.com/JamesLMilner/terra-draw/issues/491)
* **terra-draw:** correct guidance around using updateModeOptions (#479) ([](https://github.com/JamesLMilner/terra-draw/commit/cf0099fd3e8f0a526217f475cee9a21d284daedc)), closes [#479](https://github.com/JamesLMilner/terra-draw/issues/479)

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
