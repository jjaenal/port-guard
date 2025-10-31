import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCronStats } from "@/lib/hooks/useCronStats";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

/**
 * Komponen untuk menampilkan statistik cron alerts
 * Menampilkan metrics seperti last run, total runs, alerts evaluated/triggered, dll
 */
export function CronStatsPanel() {
  const { data, isLoading, error } = useCronStats();

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🤖 Cron Statistics
            <span className="text-xs text-red-500 font-normal">Error</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">
            Failed to load cron stats: {error}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🤖 Cron Statistics
            <span className="text-xs text-muted-foreground font-normal">
              Loading...
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-6 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🤖 Cron Statistics
            <span className="text-xs text-muted-foreground font-normal">
              No Data
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No cron execution data available. The cron job may not have run yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatDuration = (ms: number | null) => {
    if (!ms) return "N/A";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getStatusColor = () => {
    if (!data.lastRunAt) return "text-muted-foreground";
    const lastRun = new Date(data.lastRunAt);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastRun.getTime()) / (1000 * 60);

    // Jika last run lebih dari 10 menit yang lalu, anggap ada masalah
    if (diffMinutes > 10) return "text-red-500";
    // Jika dalam 5 menit terakhir, status bagus
    if (diffMinutes <= 5) return "text-green-500";
    // Antara 5-10 menit, warning
    return "text-yellow-500";
  };

  const getStatusText = () => {
    if (!data.lastRunAt) return "Never run";
    const lastRun = new Date(data.lastRunAt);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastRun.getTime()) / (1000 * 60);

    if (diffMinutes > 10) return "Stale";
    if (diffMinutes <= 5) return "Active";
    return "Warning";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🤖 Cron Statistics
          <span className={`text-xs font-normal ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Last Run */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Last Run</p>
            <p className="text-sm font-medium">
              {data.lastRunAt
                ? formatDistanceToNow(new Date(data.lastRunAt), {
                    addSuffix: true,
                    locale: id,
                  })
                : "Never"}
            </p>
          </div>

          {/* Total Runs */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total Runs</p>
            <p className="text-sm font-medium">
              {data.totalRuns.toLocaleString()}
            </p>
          </div>

          {/* Alerts Evaluated */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Alerts Evaluated</p>
            <p className="text-sm font-medium">
              {data.alertsEvaluated.toLocaleString()}
            </p>
          </div>

          {/* Alerts Triggered */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Alerts Triggered</p>
            <p className="text-sm font-medium text-blue-600">
              {data.alertsTriggered.toLocaleString()}
            </p>
          </div>

          {/* Average Duration */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Avg Duration</p>
            <p className="text-sm font-medium">
              {formatDuration(data.averageDurationMs)}
            </p>
          </div>

          {/* Last Duration */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Last Duration</p>
            <p className="text-sm font-medium">
              {formatDuration(data.lastDurationMs)}
            </p>
          </div>

          {/* Success Rate */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Trigger Rate</p>
            <p className="text-sm font-medium">
              {data.alertsEvaluated > 0
                ? `${((data.alertsTriggered / data.alertsEvaluated) * 100).toFixed(1)}%`
                : "0%"}
            </p>
          </div>

          {/* Status Indicator */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Status</p>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  getStatusColor() === "text-green-500"
                    ? "bg-green-500"
                    : getStatusColor() === "text-yellow-500"
                      ? "bg-yellow-500"
                      : getStatusColor() === "text-red-500"
                        ? "bg-red-500"
                        : "bg-muted-foreground"
                }`}
              />
              <span className={`text-xs ${getStatusColor()}`}>
                {getStatusText()}
              </span>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        {data.lastRunAt && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Last execution: {new Date(data.lastRunAt).toLocaleString("id-ID")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
