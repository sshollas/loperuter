import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import { OsrmRoutingProvider } from "@/lib/routing/providers/osrm";

vi.mock("axios");

const mockedGet = vi.mocked(axios.get);

describe("OsrmRoutingProvider", () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it("bruker foot-profilen for å følge veinettet", async () => {
    mockedGet.mockResolvedValue({
      data: {
        code: "Ok",
        routes: [
          {
            distance: 1500,
            duration: 420,
            geometry: "_mbgJ_c`|@_pR_pR",
          },
        ],
      },
    });

    const provider = new OsrmRoutingProvider();
    const result = await provider.getRouteBetween([
      { lat: 59.0, lng: 10.0 },
      { lat: 59.1, lng: 10.1 },
    ]);

    expect(result[0]).toMatchObject({
      distanceMeters: 1500,
      durationSeconds: 420,
    });
    expect(result[0].coordinates.length).toBeGreaterThanOrEqual(2);

    const calledUrl = mockedGet.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/route/v1/foot/");
    expect(calledUrl).toContain("annotations=distance%2Cduration");
  });

  it("normaliserer running-profil til foot", async () => {
    mockedGet.mockResolvedValue({
      data: { code: "Ok", routes: [] },
    });

    const provider = new OsrmRoutingProvider({ profile: "running" });
    await provider.getRouteBetween([
      { lat: 59.0, lng: 10.0 },
      { lat: 59.1, lng: 10.1 },
    ]);

    const calledUrl = mockedGet.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/route/v1/foot/");
  });
});
