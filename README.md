# Løperuter – variert ruteplanlegging for løpere

En produksjonsklar MVP bygget med Next.js, Express-inspirerte API-ruter og utskiftbare kart-/ruteleverandører. Appen planlegger både rundturer og punkt-til-punkt-ruter med alternative forslag som varierer i distanse, stigning og overlapp mot baseline.

## Hovedfunksjoner

- 🔁 **Rundturer** med 3–5 kandidater rundt ønsket distanse og varierende stigningsprofil.
- ↔️ **Punkt-til-punkt** med k-shortest/k-alternatives, inkludert smarte omveier som legger inn via-punkter for å nå ønsket totaldistanse.
- 🧗 **Stigningspreferanser** (min/balansert/maks) påvirker rangeringskostnaden.
- ♻️ **Overlappfilter** straffer eller filtrerer ruter som går i samme trasé som baseline (>60 % overlapp).
- 🗺️ **MapLibre-basert kart** som viser flere alternativer, høydeprofil og nøkkeltall.
- 🧪 **Testdekning** med Jest (enhets-/integrasjonstester) og Playwright (E2E).
- 🔌 **Pluggbar arkitektur** for rute- og geokodingstjenester (OSRM, ORS, Valhalla, GraphHopper, Nominatim, mock).

## Teknologi

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, MapLibre GL.
- **Backend**: Next.js API routes (Express-lignende), TypeScript.
- **Kart/ruting**: Provider-adaptere for OSRM, OpenRouteService, Valhalla og GraphHopper + mock.
- **Høyde**: Mapbox Terrain-RGB adapter eller mock.
- **Tester**: Jest + ts-jest, Playwright.

## Katalogstruktur

```
app/
  api/               # API-route handlers (Next.js serverless)
  page.tsx           # UI (tabs, kart, kontroller)
components/          # Gjenbrukbare UI-komponenter
lib/
  routing/           # Provider interface, ranking, kostfunksjon
  geo/               # Geometri-hjelpere (distance, overlap, detour, polyline ...)
  elevation/         # ElevationService + mock/mapbox
  config.ts          # Miljøkonfigurasjon
tests/               # Jest + Playwright
```

## Kom i gang

### Forutsetninger

- Node.js ≥ 18
- pnpm ≥ 8 (`corepack enable` anbefales)
- (For E2E) Playwright browser binaries (`pnpm exec playwright install`)

### Konfigurasjon

1. Kopier `.env.example` til `.env.local` og sett ønskede variabler.
2. For mock-modus holder det å beholde `ROUTING_PROVIDER=mock` og `ELEVATION_PROVIDER=mock` – ingen API-nøkler kreves.
3. Kjør `pnpm install` for å hente avhengigheter.

### Kjøre lokalt

```bash
pnpm dev
```

Appen kjører på <http://localhost:3000>. Mock-leverandører merkes i UI under notiser.

### Bytte routing-provider

Sett `ROUTING_PROVIDER` til `osrm`, `ors`, `valhalla` eller `graphhopper` og fyll inn tilhørende miljøvariabler i `.env.local`. API-adapterne følger provider-spesifikke parametre (k-alternatives, roundtrip, block_area osv.).

### Kjør tester

```bash
pnpm test       # Jest (enhets-/integrasjon)
pnpm test:e2e   # Playwright (starter dev-server automatisk)
```

> Før første Playwright-kjøring: `pnpm exec playwright install` for å hente nettlesere.

## API-oversikt

Alle endepunkter er tilgjengelig via Next.js API-ruter (`/app/api`).

### `POST /api/routes/roundtrip`

Planlegg rundturer fra gitt startpunkt/adresse.

```bash
curl -X POST http://localhost:3000/api/routes/roundtrip \
  -H "Content-Type: application/json" \
  -d '{
    "startAddress": "Torgallmenningen 1, Bergen",
    "targetDistanceMeters": 12000,
    "distanceToleranceMeters": 150,
    "preferElevation": "balanced"
  }'
```

### `POST /api/routes/point2point`

Hent baseline + alternative ruter (inkl. via-punkt omvei) mellom A og B.

```bash
curl -X POST http://localhost:3000/api/routes/point2point \
  -H "Content-Type: application/json" \
  -d '{
    "startAddress": "Karl Johans gate 1, Oslo",
    "endAddress": "Dronning Eufemias gate 16, Oslo",
    "targetDistanceMeters": 10000,
    "distanceToleranceMeters": 100,
    "preferElevation": "min"
  }'
```

### `GET /api/health`

Returnerer `{ status: "ok", timestamp }` for helsesjekk.

## Arkitekturoversikt

- `lib/routing/index.ts` orkestrerer provider-kall, elevasjonsberikelse, overlappmåling og rangeringskost (kombinasjon av distanseavvik, stigning og overlapp).
- `lib/geo/detour.ts` genererer via-punktkandidater (kompassretninger + binærsøk på radius) når mål-distanse overstiger baseline.
- `lib/geo/overlap.ts` nedsampler polyliner, hasher segmenter og beregner overlapp-ratio.
- `lib/elevation/*` tilbyr enhetsgrensesnitt for høydeprofil (`getProfile`) og summering (`getTotals`).
- UI-komponenter (`Controls`, `RouteSummary`, `ElevationChart`, `Map`) er modulære og drivs av `RouteResponse`-data.

## Mock-modus

Når `ROUTING_PROVIDER=mock` og/eller `ELEVATION_PROVIDER=mock`:

- Ruter genereres deterministisk (buede / loopede polyliner) rundt innsendte koordinater.
- Elevasjonsprofiler er syntetiske (sinus-/cosinus-baserte) men konsekvente, slik at kostfunksjonen kan testes.
- UI viser banner som informerer om mock-data.

Dette gjør det mulig å jobbe helt uten eksterne API-nøkler i dev/test.

## Produksjonsklarhet

- TypeScript i hele stacken, strenge kompilatorflagg.
- Utskiftbart provider-lag med miljøstyring.
- Standardisert kostfunksjon som favoriserer distanse-match og valgte stigningspreferanser.
- In-memory geokoding cache for å redusere latency.
- Tydelig feilhåndtering i API-ruter (returnerer JSON-feil med statuskode).
- Jest-dekning for ranking, overlapp, detour og elevasjon; Playwright for ende-til-ende.
- README, `.env.example` og scripts for rask onboarding.

## Videre arbeid

- Implementere caching-lag (Redis/memory) for dyre ruteoppslag.
- Integrasjon mot ekte elevasjons-API (Mapbox tilequery batching / SRTM).
- Persistens av brukerinnstillinger (tempo, preferanser).
- Tillegg av GPX-eksport og delingslenker.

Ta gjerne kontakt for spørsmål eller videreutvikling!
