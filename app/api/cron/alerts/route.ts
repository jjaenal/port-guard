import { NextRequest } from "next/server";
import { processAlerts } from "@/lib/services/alertService";

export async function GET(req: NextRequest) {
  try {
    // Check for API key for security (in production, use a proper API key)
    const { searchParams } = new URL(req.url);
    const apiKey = searchParams.get("apiKey");

    // In production, use a secure API key comparison
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
