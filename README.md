# Chronotrains

Chronotrains is an interactive map that allows seeing how far you can travel by train in 5h.

![Screen Shot 2022-08-30 at 3 39 18 PM](https://user-images.githubusercontent.com/11202803/187453751-816f9f2b-8cb5-4586-ae40-4bc3b5da2087.png)

## How does it work?

This map displays isochrones: the area that is reachable from a starting point in a given amount of time.

This is made possible by building a graph of train stations with the journey durations, and exploring that graph for each station to see which destinations are reachable in 1h, 2h, ... 5h.

The source data is from the Deutsche Bahn, conveniently wrapped into an API by [Direkt Bahn Guru](https://github.com/juliuste/api.direkt.bahn.guru).

Because local transit is not included for most cities, there are no journeys available between different stations that can actually be connected by bus, bike, or on foot.

We add edges between those closeby stations (when the distance is less than 10 km), assuming the distance can be traveled at 9 km/h (faster than walking, slower than biking).

After scraping this data, we pre-compute the isochrones. We assume interchanges last 20 minutes.
The isochrones are stored as GeoJSON and served on hover.

## Technology

This is a Next.js application deployed on Vercel. This allows using the Vercel Edge cache to serve the isochrones fast enough to have a smooth experience.

The mapping library is maplibre-gl.

The data is stored on a Postgres database hosted at Supabase.

The pre-processing is a mix between Node.js scripts and SQL queries. It is currently triggered by hand and processed locally.

## Internationalization

We use `next-i18next` to translate the app into various languages. If you'd like to contribute a language, you can do so by submitting a Pull Request with a new file in `public/locales/[your language]/common.json`, and editing `next-i18next.config.js` to add your locale name.

## Cloning the repo

Previous versions of the git history contained all the data committed as static files. For faster cloning, use `git clone --depth 1 https://github.com/benjamintd/chronotrains.git`.
