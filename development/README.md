# Terra Draw Local Example

This example shows how to use Terra Draw with a variety of providers (currently Leaflet, Mapbox GL, Google Maps)

# Running Locally

Create a `.env` file with the following variables:

```
GOOGLE_API_KEY=YOUR_KEY_HERE
MAPBOX_ACCESS_TOKEN=YOUR_ACCESS_TOKEN_HERE
```

You can then create a watching build that allows you to test out both changes in the example but also the Terra Draw source itself, like so:

`npm run serve`

This will start a hot reloading development server on port 9000 that you can explore via [http://localhost:9000](http://localhost:9000). 