import { BACKEND_PATHS } from "@/server/adapters/backendContracts";
import { forwardPasswordRecovery } from "../password-recovery";

export async function POST(request: Request) {
  return forwardPasswordRecovery(request, BACKEND_PATHS.authForgotPassword);
}
