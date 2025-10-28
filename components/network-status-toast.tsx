"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function NetworkStatusToast() {
  useEffect(() => {
    function onOffline() {
      toast.warning("You are offline", {
        description: "Some data may be stale until connection is restored.",
      });
    }
    function onOnline() {
      toast.success("Back online", {
        description: "Resuming live updates.",
      });
    }
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);
  return null;
}