# Løperuter

Produksjonsklar MVP for planlegging av løperuter med rundtur og punkt-til-punkt-alternativer. Prosjektet består av en Next.js-frontend med MapLibre-kart og en Express-backend (kjørt via Next) som tilbyr rute- og høydedata gjennom en pluggbar tjeneste-arkitektur.

## Kom i gang

Installer avhengigheter med pnpm:

```bash
pnpm install
```

Kjør utviklingsserveren (Express + Next) med hot reload:

```bash
pnpm dev
```

Serveren starter på [http://localhost:3000](http://localhost:3000).

### Miljøvariabler

Kopier `.env.example` til `.env.local` og tilpass ved behov:

```bash
cp .env.example .env.local
```

Tilgjengelige variabler:

- `ROUTING_PROVIDER` – `osrm` (default), `ors` (OpenRouteService), `local` (forhåndsberegnet graf) eller `mock`.
- `ORS_API_KEY` – API-nøkkel for ORS hvis `ROUTING_PROVIDER=ors`.
- `OSRM_BASE_URL` – valgfritt OSRM-endepunkt (default `https://router.project-osrm.org`).
- `OSRM_PROFILE` – OSRM-profil (`foot` er default og sikrer løpbare ruter på veinettet).
- `LOCAL_ROUTING_GRAPH_PATH` – sti til forhåndsberegnet graf dersom `ROUTING_PROVIDER=local` (default `server/data/localGraph.json`).
- `ELEVATION_PROVIDER` – `mock` eller `mapbox` (krever `MAPBOX_TOKEN`).
- `GEOCODER_PROVIDER` – `mock`, `ors` eller `nominatim`.
- `DEFAULT_PACE_SECONDS_PER_KM` – brukes til estimering av løpstid.

Uten nøkler bruker systemet OSRMs offentlige ruteringsinstans for veinettfølgende ruter og benytter `foot`-profilen slik at traséene følger løpbare gater og stier. Sett `ROUTING_PROVIDER=mock` for å kjøre helt offline med deterministiske ruter og syntetiske høydeprofiler, `local` for å bruke en forhåndsberegnet fotgjengergraf fra disk, eller `ors` dersom du har ORS-nøkkel.

### Bygge en lokal graf

For å kjøre helt uten eksterne ruteleverandører kan du forhåndsberegne et gangbart veinett fra et GeoJSON-sett (for eksempel et utdrag fra OSM).

```bash
pnpm build:local-graph path/til/inn.geojson server/data/localGraph.json "Kildebeskrivelse"
```

Scriptet filtrerer bort motorvei- og service-veier, lager et nodedatasett for hvert kryss og kobler sammen segmenter med målt distanse. Sett deretter `ROUTING_PROVIDER=local` (og eventuelt `LOCAL_ROUTING_GRAPH_PATH` hvis du skrev grafen et annet sted) før du starter serveren.

## Bygg og drift

Prod-bygg og server for produksjon:

```bash
pnpm build
pnpm start
```

`pnpm build` produserer både Next.js-build og kompilerer Express-serveren til `dist/server.js`.

## Testing

Kjør enhetstester (Vitest):

```bash
pnpm test
```

Kjør ESLint:

```bash
pnpm lint
```

Kjør Playwright E2E-tester (krever at du har installert nettleserdrivere med `pnpm exec playwright install --with-deps`):

```bash
pnpm test:e2e
```

## Strukturen i prosjektet

```
/app                # Next.js app router + API-endepunkter
  /api/routes       # Route-handlere (deles mellom Next og Express)
/components        # Klientkomponenter for UI
/lib               # Domenelogikk (routing, geodata, høydedata)
/server            # Express-oppstart som wrapper Next
/tests             # Vitest testfiler
```

Routing- og geotjenester er implementert via provider-grensesnitt slik at eksterne leverandører enkelt kan kobles inn. ElevationService kan byttes mellom Mapbox Terrain RGB og mockdata. Alle nettverkskall fanger opp feil og returnerer bruker-vennlige feilmeldinger i UI-et.

## E2E test-scenario

Playwright-skriptet (se `tests/e2e.spec.ts`) kjører et grunnleggende "happy path" med mock-providere: bruker fyller inn adresser, genererer ruter og bytter stigningspreferanse.

## Lisens

Dette prosjektet er levert som en teknisk MVP og ingen eksplisitt lisens er angitt.
