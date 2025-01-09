# E2E Testing with Playwright

We provide a basic end-to-end (E2E) test suite via Playwright, testing against the Leaflet Adapter. The test suite aims to emulate how an end user would interact with and use Terra Draw. Here we can attempt to catch bugs earlier in the pipeline and ensure that new behaviours in the future adhere to a given specification. 

## Installation

Installation can be down via npm like so:

```shell
npm install
```

## Running

You can run the tests headless (i.e. no opening of Chromimum) like so:

```shell
npm run test
```

Or you can run them headed (i.e. Chromimum will open and you will see the tests run) like so:

```shell
npm run test:headed
```

## Tests

Tests are located in the `tests` folder. You will see the `leaflet.spec.ts` file, this is where the tests are kept for the E2E tests written for the Leaflet Adapter. There are also some convienence methods written in the `setup.ts` file which can be leveraged to write tests more easily.