import { postPasswordRecovery } from "../password-recovery";

export function POST(request: Request) {
  return postPasswordRecovery(request, "forgot-password");
}
