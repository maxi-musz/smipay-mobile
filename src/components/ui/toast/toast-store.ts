import { create } from "zustand";

export interface Toast {
  id: string;
  variant: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  /** Auto-dismiss duration in ms. Default 4000. Set 0 to persist. */
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  show: (toast: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

let _counter = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  show: (toast) => {
    const id = `toast_${++_counter}_${Date.now()}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
  },

  dismiss: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));
