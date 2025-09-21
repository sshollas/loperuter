import { z } from "zod";
import { planPointToPoint } from "@/lib/routing";
import type { RouteResponse } from "@/types/route";

const pointToPointSchema = z.object({
  startAddress: z.string().optional(),
  start: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  endAddress: z.string().optional(),
  end: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  targetDistanceMeters: z.number().positive(),
  distanceToleranceMeters: z.number().positive().optional(),
  preferElevation: z.enum(["min", "max", "balanced"]).optional(),
});

export async function handlePointToPoint(body: unknown): Promise<RouteResponse> {
  const parsed = pointToPointSchema.parse(body);
  return planPointToPoint(parsed);
}
