import { cookies } from "next/headers";
import { appConfig } from "@/config/app";
import type {
  LoginCredentials,
  LoginResponse,
} from "@/types/auth";

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

  if (!data.token) {
    throw new Error("INVALID_AUTH_RESPONSE");
  }

  const accessToken = data.token;

  const cookieStore = await cookies();

  // Token
  cookieStore.set(
    appConfig.authCookieName,
    accessToken,
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    }
  );

  // User ID
  cookieStore.set(
    "auth_user_id",
    data.userId,
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    }
  );

  // Roles
  cookieStore.set(
    "auth_roles",
    JSON.stringify(data.roles ?? []),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    }
  );

  // Username
  cookieStore.set(
    appConfig.userNameCookieName,
    credentials.username,
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    }
  );

  console.log("→ Access token saved to HttpOnly Cookie");
  console.log("→ User ID:", data.userId);
  console.log("→ Roles:", data.roles);

  return {
    accessToken,
    userId: data.userId,
    roles: data.roles ?? [],
  };
}