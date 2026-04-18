# MEPC 84 Intelligence Dashboard

A D3.js data visualization dashboard for the IMO MEPC 84 meeting submissions and country development classifications.

**Live URL:** https://fitzroypet.github.io/mepc84-dashboard/

---

## Setup: Connecting Google Sheets (so data stays editable)

1. **Upload your Excel files to Google Drive**
   - Go to [drive.google.com](https://drive.google.com)
   - Drag and drop `MEPC84_Stance_Analysis_v2.xlsx` → Drive auto-converts it to Sheets
   - Repeat for `UN_IMO_Country_Development_Classification.xlsx`

2. **Make each sheet public**
   - Open the Google Sheet → Share → "Anyone with the link" → Viewer

3. **Get the Sheet ID and Tab GIDs**
   - The Sheet ID is in the URL: `docs.google.com/spreadsheets/d/**[SHEET_ID]**/edit`
   - Click each tab at the bottom → the URL shows `#gid=**[TAB_GID]**`

4. **Paste the IDs into `js/config.js`**
   ```
   mepc84.id → your MEPC84 sheet ID
   mepc84.tabs.register.gid → GID of the "Register (enriched)" tab
   mepc84.tabs.crossAgenda.gid → GID of the "Cross-Agenda Profile" tab
   mepc84.tabs.landscape.gid → GID of the "Originator Landscape" tab
   countries.id → your Country Classification sheet ID
   countries.tabs.countryList.gid → GID of the "Country List" tab
   countries.tabs.imoMembers.gid → GID of the "IMO Members" tab
   ```

5. Push to GitHub → dashboard auto-refreshes from your live Google Sheets.

> **If Google Sheets is not configured**, the dashboard automatically falls back to the local Excel files in the `data/` folder.

---

## Deploying to GitHub Pages

1. Create a new repo at github.com/fitzroypet/mepc84-dashboard
2. Push this folder:
   ```bash
   cd mepc84-dashboard
   git init
   git add .
   git commit -m "Initial dashboard"
   git remote add origin https://github.com/fitzroypet/mepc84-dashboard.git
   git push -u origin main
   ```
3. In GitHub: **Settings → Pages → Source: Deploy from branch → main / (root)**
4. Your dashboard is live at `https://fitzroypet.github.io/mepc84-dashboard/`

The GitHub Actions workflow (`.github/workflows/deploy.yml`) also supports auto-deploy on every push.

---

## Embedding in your React/Next.js site

```jsx
// In any React component:
export function MEPCDashboard() {
  return (
    <iframe
      src="https://fitzroypet.github.io/mepc84-dashboard/embed.html"
      width="100%"
      height="800"
      frameBorder="0"
      title="MEPC 84 Dashboard"
      style={{ borderRadius: '8px' }}
    />
  );
}
```

You can also control the dashboard filters from your React app:
```js
const iframe = document.querySelector('iframe');
// Filter to Agenda Item 7 (GHG)
iframe.contentWindow.postMessage({ filter: 'agendaItem', value: '7' }, '*');
// Clear all filters
iframe.contentWindow.postMessage({ filter: 'agendaItem', value: null }, '*');
```

Available filter keys: `agendaItem`, `devGroup`, `sentiment`, `stanceMacro`

---

## Updating the Originator Map

When your Register data includes new originator names not automatically matched, add them to `data/originator_country_map.json`:

```json
"New Originator Name": {
  "type": "Country",
  "iso3": "XYZ",
  "finalClassification": "Developing (Other)"
}
```

Types: `Country`, `Coalition`, `NGO-Industry`, `NGO-Environment`, `Intergovernmental`, `IMO-Secretariat`

---

## Chart Overview

| Chart | What it shows |
|---|---|
| Stance Distribution (donut) | Macro-category breakdown of all submissions |
| Sentiment by Agenda Item (stacked bar) | Favourable / Neutral / Problematic per agenda item |
| Originator Submissions (bubble) | Each originator sized by total submissions, coloured by dev. status |
| Agenda Activity Heatmap | Top 20 originators × agenda items |
| Development Status (donut) | 199 countries by UN/IMO classification |
| World Map (choropleth) | Countries coloured by development classification |
| Stance by Dev Group (grouped bar) | % stance alignment broken down by development group |

All charts are cross-linked: clicking any element filters all other charts.
