# Local Development Example

This example shows how to use Terra Draw with a variety of providers (currently Leaflet, Mapbox GL, Google Maps)

# Installation


If you haven't already, you will need to install the dependencies for the root of the project, as well as the dependencies for the `development/` directory:


```shell
npm install
cd development/
npm install
```

# Running Locally

Create a `.env` file (or rename the included `.env.example`) in the `development/` directory with the following variables:

```
GOOGLE_API_KEY=YOUR_KEY_HERE
MAPBOX_ACCESS_TOKEN=YOUR_ACCESS_TOKEN_HERE
```

You can then create a watching build that allows you to test out both changes in the example but also the Terra Draw source itself, like so:

```shell
npm run serve
```

This will start a hot reloading development server on port 9000 that you can explore via [http://localhost:9000](http://localhost:9000). 