import { proxyEvaluationRequest } from "@/app/api/evaluation/proxyEvaluationRequest";

export async function GET(request: Request) {
  const query = new URLSearchParams({ "Filters[userapprove]": "1" });
  return proxyEvaluationRequest(`/employeeInfor/get-user-by-filter?${query}`, {
    signal: request.signal,
  });
}
