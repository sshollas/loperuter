# Løperuter MVP

Denne repoen består av to deler:

1. `graph-builder/` – Python-script for å laste ned og prosessere et gangbart nettverk i Oslo fra OpenStreetMap.
2. Next.js-applikasjonen i rotkatalogen som eksponerer API-endepunkter for ruteberegning og enkel frontend for å teste dem.

## Kjøre applikasjonen

1. Installer Python-avhengigheter og bygg grafen:

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r graph-builder/requirements.txt
python3 graph-builder/build_oslo_graph.py
```

Dette skriver `data/nodes.parquet` og `data/edges.parquet`. For lokal utvikling finnes også `data/nodes.sample.json` og `data/edges.sample.json` med et minimalt nettverk som brukes som fallback.

2. Installer Node-avhengigheter og start serveren:

```bash
npm install
npm run dev
```

API-et vil være tilgjengelig på `http://localhost:3000/api/...`, og frontend på `http://localhost:3000`.

## Tester

Kjør `npm test` for å kjøre Vitest-baserte enhetstester for rutelogikken.
