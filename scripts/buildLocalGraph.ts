#!/usr/bin/env tsx
import { readFile, writeFile } from "fs/promises";
import { argv, exit } from "process";
import type { FeatureCollection } from "geojson";
import { buildLocalGraph } from "@/lib/routing/local/builder";

async function main() {
  const [, , inputPath, outputPath, sourceName] = argv;
  if (!inputPath || !outputPath) {
    console.error("Bruk: pnpm tsx scripts/buildLocalGraph.ts <input.geojson> <output.json> [source]");
    exit(1);
  }

  const raw = await readFile(inputPath, "utf8");
  const geojson = JSON.parse(raw) as FeatureCollection;
  const graph = buildLocalGraph(geojson, { sourceName });
  await writeFile(outputPath, `${JSON.stringify(graph, null, 2)}\n`);
  console.log(
    `Skrev graf med ${graph.nodes.length} noder og ${graph.edges.length} kanter til ${outputPath}`,
  );
}

main().catch((error) => {
  console.error("Kunne ikke bygge lokal graf:", error);
  exit(1);
});
