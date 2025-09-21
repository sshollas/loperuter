import express, { Request, Response } from "express";
import next from "next";
import { handleRoundTrip } from "@/app/api/routes/roundtrip/handler";
import { handlePointToPoint } from "@/app/api/routes/point2point/handler";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev, dir: "." });
const nextHandler = nextApp.getRequestHandler();

function sendError(res: Response, error: unknown) {
  const message = error instanceof Error ? error.message : "Ukjent feil";
  const status = message.includes("Fant ingen") ? 404 : 400;
  res.status(status).json({ message });
}

async function createServer() {
  await nextApp.prepare();
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.post("/api/routes/roundtrip", async (req: Request, res: Response) => {
    try {
      const response = await handleRoundTrip(req.body);
      res.json(response);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/routes/point2point", async (req: Request, res: Response) => {
    try {
      const response = await handlePointToPoint(req.body);
      res.json(response);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.use((req: Request, res: Response) => {
    nextHandler(req, res);
  });

  app.listen(port, () => {
    console.log(`🚀 Loperuter klar på http://localhost:${port}`);
  });
}

createServer().catch((error) => {
  console.error("Kunne ikke starte server", error);
  process.exit(1);
});
