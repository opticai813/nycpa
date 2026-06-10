# NYCPA.online

A static prototype for a New York CPA marketplace directory. It includes:

- Searchable CPA profiles by name, firm, location, specialty, client type, and availability
- Profile detail views with services, contact details, fee, experience, and license field
- CPA profile registration and claim intake
- Local browser persistence with `localStorage`
- CSV import and export for loading a production dataset

## Data note

The bundled profiles are demo records, not official New York CPA license records. For production, import a licensed or official dataset through the CSV import tool and keep profile claims pending until reviewed.

Recommended CSV columns:

```csv
name,firm,city,region,license,specialties,clients,languages,email,phone,website,address,googlePlaceId,googleMapsUrl,linkedinUrl,rating,reviews,experience,fee,bio,accepting,virtual,source,sourceUrl
```

Multi-value fields such as `specialties`, `clients`, and `languages` can use comma-separated or semicolon-separated values.

## Google reviews and ratings

Do not scrape Google search results, Google Maps pages, or review text into this directory. For Google-sourced business metadata, use Google Maps Platform Places API exports or another licensed source, then import only permitted fields such as Place ID, Maps URL, rating, and user rating count.

For other web-sourced CPA data, use only sources whose terms permit reuse, import factual business profile fields, and include `sourceUrl` so each profile can be audited later.

Do not scrape LinkedIn profiles. LinkedIn URLs should be added by the CPA during registration, provided by the firm, or imported from a consented/licensed source.

Helpful official docs:

- Places API Place Details: https://developers.google.com/maps/documentation/places/web-service/place-details
- Google Maps Platform Terms: https://cloud.google.com/maps-platform/terms

## Run

For directory-only browsing, open `index.html` in a browser. No build step is required.

For AI chat, run the local server so the OpenAI API key stays off the browser:

```powershell
$env:OPENAI_API_KEY="sk-your-api-key-here"
npm start
```

Then open:

```text
http://127.0.0.1:8787
```

Optional:

```powershell
$env:OPENAI_MODEL="gpt-4.1-mini"
$env:PORT="8787"
```

Never place the OpenAI API key in `index.html`, `app.js`, or any browser-visible file.

For a production launch, add a backend database, admin review workflow, official license verification sync, authentication for CPA profile owners, and spam protection on submissions.
