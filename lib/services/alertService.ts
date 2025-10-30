import { PrismaClient, Alert } from "@/lib/generated/prisma";
import { fetchTokenPrice } from "@/lib/api/coingecko";
import { sendEmail, buildAlertEmailHtml } from "./notificationService";

let prisma = new PrismaClient();

// Test-only hook: allow injecting Prisma client for unit tests
export function __setPrismaClientForTest(client: PrismaClient) {
  prisma = client;
}

/**
 * Creates a notification record when an alert is triggered
 * @param alert The alert that was triggered
 * @param context Context information about the trigger
 */
async function createNotification(
  alert: Alert,
  context: {
    type: "price" | "portfolio";
    currentValue: number;
    tokenSymbol?: string | null;
    address?: string | null;
  },
): Promise<void> {
  try {
    let title: string;
    let message: string;

    if (context.type === "price" && context.tokenSymbol) {
      title = `${context.tokenSymbol} Price Alert`;
      message = `${context.tokenSymbol} is now $${context.currentValue.toFixed(2)} (${alert.operator} $${alert.value})`;
    } else if (context.type === "portfolio" && context.address) {
      title = "Portfolio Value Alert";
      message = `Portfolio value is now $${context.currentValue.toFixed(2)} (${alert.operator} $${alert.value})`;
    } else {
      return; // Skip if we don't have enough context
    }

    await prisma.notification.create({
      data: {
        alertId: alert.id,
        address: alert.address,
        title,
        message,
        type: alert.type,
        isRead: false,
        triggeredAt: new Date(),
      },
    });

    console.log(`Notification created for alert ${alert.id}: ${title}`);
  } catch (error) {
    console.error(`Error creating notification for alert ${alert.id}:`, error);
  }
}

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

            const alertContext = {
              type: "price" as const,
              currentValue: price,
              tokenSymbol: alert.tokenSymbol,
            };

            // Create notification record
            await createNotification(alert, alertContext);

            // Send email notification if configured
            await sendAlertNotification(alert, alertContext);

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

          const alertContext = {
            type: "portfolio" as const,
            currentValue,
            address: alert.address,
          };

          // Create notification record
          await createNotification(alert, alertContext);

          // Send email notification if configured
          await sendAlertNotification(alert, alertContext);

          console.log(
            `Portfolio alert triggered: ${alert.address} ${alert.operator} ${alert.value} (current ${currentValue})`,
          );
        }
      } catch (error) {
        console.error(
          `Error processing portfolio alert for ${alert.address}:`,
          error,
        );
      }
    }
  } catch (error) {
    console.error("Error processing alerts:", error);
  }
}

/**
 * Sends email notification for triggered alert
 */
async function sendAlertNotification(
  alert: Alert,
  context: {
    type: "price" | "portfolio";
    currentValue: number;
    tokenSymbol?: string | null;
    address?: string | null;
  },
): Promise<void> {
  try {
    // For now, we'll use a placeholder email. In production, this would come from user settings
    const recipientEmail =
      process.env.ALERT_NOTIFICATION_EMAIL || "admin@portguard.app";

    let subject: string;
    let message: string;

    if (context.type === "price" && context.tokenSymbol) {
      subject = `Price Alert: ${context.tokenSymbol} ${alert.operator} $${alert.value}`;
      message = `Your ${context.tokenSymbol} price alert has been triggered!
        
Current price: $${context.currentValue.toFixed(2)}
Alert condition: ${alert.operator} $${alert.value}
        
This alert was set up for your portfolio tracking.`;
    } else if (context.type === "portfolio" && context.address) {
      subject = `Portfolio Alert: ${alert.operator} $${alert.value}`;
      message = `Your portfolio value alert has been triggered!
        
Current portfolio value: $${context.currentValue.toFixed(2)}
Alert condition: ${alert.operator} $${alert.value}
Wallet: ${context.address}
        
This alert was set up for your portfolio tracking.`;
    } else {
      return; // Skip if we don't have enough context
    }

    const html = buildAlertEmailHtml(subject, message);

    const result = await sendEmail({
      to: [recipientEmail],
      subject,
      html,
    });

    if (result.success) {
      console.log(
        `Email notification sent for alert ${alert.id}: ${result.id}`,
      );
    } else {
      console.warn(
        `Failed to send email notification for alert ${alert.id}: ${result.error}`,
      );
    }
  } catch (error) {
    console.error(
      `Error sending alert notification for alert ${alert.id}:`,
      error,
    );
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
