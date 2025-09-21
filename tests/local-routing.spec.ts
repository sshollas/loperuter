import { describe, expect, it } from "vitest";
import sampleGraph from "./fixtures/sample-local-graph.json";
import type { FeatureCollection } from "geojson";
import sampleWalkwaysRaw from "./fixtures/sample-walkways.geojson?raw";
import { buildLocalGraph } from "@/lib/routing/local/builder";
import { LocalRoutingProvider } from "@/lib/routing/providers/local";

const provider = new LocalRoutingProvider({ graphData: sampleGraph });

describe("local routing provider", () => {
  it("finner rute mellom to punkter", async () => {
    const [route] = await provider.getRouteBetween([
      { lat: 59.91268, lng: 10.74155 },
      { lat: 59.91425, lng: 10.74385 },
    ]);
    expect(route.coordinates.length).toBeGreaterThan(2);
    expect(route.distanceMeters).toBeGreaterThan(200);
    expect(route.steps?.length).toBeGreaterThan(0);
    const stepNames = route.steps?.map((step) => step.name);
    expect(stepNames).toContain("Karl Johans gate");
    expect(stepNames).toContain("Universitetsgata");
  });

  it("returnerer flere segmenter for ruter med veiskifter", async () => {
    const [route] = await provider.getRouteBetween([
      { lat: 59.91268, lng: 10.74155 },
      { lat: 59.91085, lng: 10.74625 },
    ]);
    expect(route.steps?.map((step) => step.name)).toEqual([
      "Karl Johans gate",
      "Stortorvet",
    ]);
  });
});

describe("local graph builder", () => {
  it("filtrerer bort motorveier", () => {
    const collection = JSON.parse(sampleWalkwaysRaw) as FeatureCollection;
    const graph = buildLocalGraph(collection, { sourceName: "test" });
    const highwayNames = new Set(graph.edges.map((edge) => edge.name));
    expect(highwayNames.has("Ring 1")).toBe(false);
    expect(graph.nodes.length).toBeGreaterThan(0);
  });
});
