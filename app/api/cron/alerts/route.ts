import { NextRequest } from "next/server";
import { processAlerts } from "@/lib/services/alertService";

export async function GET(req: NextRequest) {
  try {
    // Cek API key untuk keamanan
    // Mendukung via header: 'x-api-key' atau 'authorization: Bearer <key>'
    // Fallback: query param 'apiKey'
    const { searchParams } = new URL(req.url);
    const queryKey = searchParams.get("apiKey");
    const headerKey = req.headers.get("x-api-key");
    const authHeader = req.headers.get("authorization");
    const bearerKey = authHeader?.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : undefined;
    const apiKey = headerKey ?? bearerKey ?? queryKey;

    // Validasi API key
    if (!apiKey || apiKey !== process.env.ALERTS_CRON_API_KEY) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Process alerts
    await processAlerts();

    return Response.json({
      success: true,
      message: "Alerts processed successfully",
    });
  } catch (error) {
    console.error("Error processing alerts:", error);
    return Response.json(
      { error: "Failed to process alerts" },
      { status: 500 },
    );
  }
}
