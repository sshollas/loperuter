import { z } from "zod";
import { planRoundTrip } from "@/lib/routing";
import type { RouteResponse } from "@/types/route";

const roundTripSchema = z.object({
  startAddress: z.string().optional(),
  start: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  targetDistanceMeters: z.number().positive(),
  distanceToleranceMeters: z.number().positive().optional(),
  preferElevation: z.enum(["min", "max", "balanced"]).optional(),
});

export async function handleRoundTrip(body: unknown): Promise<RouteResponse> {
  const parsed = roundTripSchema.parse(body);
  return planRoundTrip(parsed);
}
