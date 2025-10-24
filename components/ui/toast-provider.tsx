"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { Toast, ToastContainer, ToastProps } from "./toast";

type ToastContextType = {
  toast: (props: Omit<ToastProps, "id" | "onClose">) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const toast = useCallback((props: Omit<ToastProps, "id" | "onClose">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [
      ...prev,
      { ...props, id, onClose: () => dismiss(id) },
    ]);
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <ToastContainer>
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} />
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
