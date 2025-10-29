import { PrismaClient, Alert } from "@/lib/generated/prisma";
import { fetchTokenPrice } from "@/lib/api/coingecko";

const prisma = new PrismaClient();

/**
 * Checks if an alert condition is met based on current token price
 * @param alert The alert to check
 * @param currentPrice Current token price
 * @returns Boolean indicating if the alert condition is met
 */
export async function checkAlertCondition(
  alert: Alert,
  currentPrice: number,
): Promise<boolean> {
  switch (alert.operator) {
    case "above":
      return currentPrice > alert.value;
    case "below":
      return currentPrice < alert.value;
    case "percent_increase":
      // For percent increase, we need historical data
      // This is a simplified implementation
      const previousPrice = currentPrice / (1 + alert.value / 100);
      return (
        ((currentPrice - previousPrice) / previousPrice) * 100 >= alert.value
      );
    case "percent_decrease":
      // For percent decrease, we need historical data
      // This is a simplified implementation
      const basePrice = currentPrice / (1 - alert.value / 100);
      return ((basePrice - currentPrice) / basePrice) * 100 >= alert.value;
    default:
      return false;
  }
}

/**
 * Processes all active alerts and triggers notifications for conditions that are met
 */
export async function processAlerts(): Promise<void> {
  try {
    // Get all enabled alerts
    const alerts = await prisma.alert.findMany({
      where: {
        enabled: true,
      },
    });

    // Group alerts by token to minimize API calls
    const tokenAlerts = new Map<string, Alert[]>();

    alerts.forEach((alert) => {
      if (alert.tokenSymbol) {
        const key = alert.tokenSymbol.toLowerCase();
        if (!tokenAlerts.has(key)) {
          tokenAlerts.set(key, []);
        }
        tokenAlerts.get(key)?.push(alert);
      }
    });

    // Process each token's alerts
    for (const [token, tokenAlertsList] of tokenAlerts.entries()) {
      try {
        // Fetch current price for the token
        const price = await fetchTokenPrice(token);

        if (!price) continue;

        // Check each alert for this token
        for (const alert of tokenAlertsList) {
          const isTriggered = await checkAlertCondition(alert, price);

          if (isTriggered) {
            // Update the alert's lastTriggered timestamp
            await prisma.alert.update({
              where: { id: alert.id },
              data: { lastTriggered: new Date() },
            });

            // Here you would implement notification logic
            // e.g., send email, push notification, etc.
            console.log(
              `Alert triggered: ${alert.tokenSymbol} ${alert.operator} ${alert.value}`,
            );
          }
        }
      } catch (error) {
        console.error(`Error processing alerts for token ${token}:`, error);
      }
    }

    // Process portfolio value alerts using latest snapshots
    const portfolioAlerts = alerts.filter((a) => a.type === "portfolio");
    for (const alert of portfolioAlerts) {
      try {
        // Get latest snapshot for the alert's address
        const snapshot = await prisma.portfolioSnapshot.findFirst({
          where: { address: alert.address },
          orderBy: { createdAt: "desc" },
        });

        if (!snapshot) continue;

        const currentValue = snapshot.totalValue ?? 0;
        const isTriggered = await checkAlertCondition(alert, currentValue);

        if (isTriggered) {
          await prisma.alert.update({
            where: { id: alert.id },
            data: { lastTriggered: new Date() },
          });

          console.log(
            `Portfolio alert triggered: ${alert.address} ${alert.operator} ${alert.value} (current ${currentValue})`,
          );
        }
      } catch (error) {
        console.error(`Error processing portfolio alert for ${alert.address}:`, error);
      }
    }
  } catch (error) {
    console.error("Error processing alerts:", error);
  }
}

/**
 * Schedules the alert processing to run at regular intervals
 * @param intervalMinutes How often to check alerts (in minutes)
 */
export function scheduleAlertProcessing(intervalMinutes = 5): NodeJS.Timeout {
  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(`Scheduling alert processing every ${intervalMinutes} minutes`);

  return setInterval(async () => {
    console.log("Running scheduled alert processing...");
    await processAlerts();
  }, intervalMs);
}
