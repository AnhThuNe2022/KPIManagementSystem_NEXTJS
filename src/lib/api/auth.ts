import { cookies } from "next/headers";
import { appConfig } from "@/config/app";

import type {
  LoginCredentials,
  LoginResponse,
} from "@/types/auth";

/**
 * Server-only boundary for the .NET Web API integration.
 */
export async function authenticate(
  credentials: LoginCredentials
): Promise<LoginResponse> {

  const apiUrl = process.env.AUTH_API_URL;

  if (!apiUrl) {
    throw new Error("API_URL_NOT_CONFIGURED");
  }

  const url = `${apiUrl.replace(/\/$/, "")}/auth/login`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      emailOrUserName: credentials.username,
      password: credentials.password,
    }),
    cache: "no-store",
  });


  const data = await response.json();


  if (!response.ok) {
    throw new Error("INVALID_CREDENTIALS");
  }

  // API .NET trả về "token"
  if (!data.token) {
    throw new Error("INVALID_AUTH_RESPONSE");
  }

  const accessToken = data.token;

  // Lưu token vào HttpOnly Cookie
  const cookieStore = await cookies();

  cookieStore.set(appConfig.authCookieName, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 giờ
  });

  console.log("→ Access token saved to HttpOnly Cookie");

  return {
    accessToken,
  };
}