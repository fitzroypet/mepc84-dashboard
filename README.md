# World Classification Map

A simplified static dashboard that shows a world map colored by each country's `Final Classification`.

## What It Does

- Displays a single world map view
- Colors each country by the classification stored in the `Country List` sheet
- Shows a fixed legend for:
  - `Developed`
  - `Developing (Other)`
  - `LDC only`
  - `SIDS only`
  - `SIDS + LDC (Dual Status)`
  - `Economy in Transition`
- Falls back to a neutral gray for geography that does not have a matching classification record

## Data Source

The app only needs the country classification workbook:

- `data/UN_IMO_Country_Development_Classification.xlsx`

If the country Google Sheet is configured in [`js/config.js`](./js/config.js), the app will try that first and fall back to the local Excel file if loading fails.

## Setup Google Sheets

1. Upload `UN_IMO_Country_Development_Classification.xlsx` to Google Drive.
2. Open it as a Google Sheet.
3. Share it as `Anyone with the link can view`.
4. Copy the sheet ID and the `Country List` tab GID into [`js/config.js`](./js/config.js).

Only the `countries.id` and `countries.tabs.countryList.gid` values are needed for this map.

## Local Assets

The map expects these local assets:

- `data/UN_IMO_Country_Development_Classification.xlsx`
- `data/countries-110m.json`

The second file is the bundled world geometry used by the choropleth, so the rendered map does not need to fetch country shapes from a runtime CDN.

## Deploying To GitHub Pages

1. Push the `mepc84-dashboard` folder to a GitHub repository.
2. In GitHub, enable Pages from the branch root.
3. The static files will serve directly from the repository.

## Embedding

```jsx
export function ClassificationMapEmbed() {
  return (
    <iframe
      src="https://fitzroypet.github.io/mepc84-dashboard/embed.html"
      width="100%"
      height="760"
      frameBorder="0"
      title="World Classification Map"
      style={{ borderRadius: '16px' }}
    />
  );
}
```

The embed is the same map-only experience in a tighter layout. The previous filter `postMessage` API has been removed.
