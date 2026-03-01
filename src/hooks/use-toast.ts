/**
 * Compatibility shim: routes all toast calls through sonner.
 * This replaces the old radix-based toast system with a single sonner provider.
 */
import { toast as sonnerToast } from "sonner";

type ToastProps = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  action?: React.ReactNode;
  [key: string]: any;
};

function toast(props: ToastProps) {
  const { title, description, variant } = props;
  if (variant === "destructive") {
    sonnerToast.error(title || "Error", description ? { description } : undefined);
  } else {
    sonnerToast(title || "", description ? { description } : undefined);
  }
  return { id: "", dismiss: () => {}, update: () => {} };
}

function useToast() {
  return {
    toast,
    toasts: [] as any[],
    dismiss: () => {},
  };
}

export { useToast, toast };
