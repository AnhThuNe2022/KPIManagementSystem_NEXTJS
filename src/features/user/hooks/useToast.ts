import {
  toast
} from "sonner";

export function useToast() {

  return {
    success: (message: string) =>
      toast.success(message),

    error: (message: string) =>
      toast.error(message),

    warning: (message: string) =>
      toast.warning(message),
  };
}