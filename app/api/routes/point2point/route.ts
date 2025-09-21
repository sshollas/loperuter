import { NextResponse } from "next/server";
import { handlePointToPoint } from "./handler";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const response = await handlePointToPoint(payload);
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { message: (error as Error).message },
      { status: 400 },
    );
  }
}
