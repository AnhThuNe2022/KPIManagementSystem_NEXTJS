import { NextRequest, NextResponse } from "next/server";

const AUTH_API_URL = process.env.AUTH_API_URL;
const AUTH_COOKIE_NAME =
  process.env.AUTH_COOKIE_NAME || "dcg_kpi_access_token";

export async function POST(request: NextRequest) {
  try {
    if (!AUTH_API_URL) {
      return NextResponse.json(
        {
          success: false,
          message: "AUTH_API_URL chưa được cấu hình.",
        },
        { status: 500 }
      );
    }

    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy access token.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const response = await fetch(
      `${AUTH_API_URL}/KPIEvaluation/evaualtion/get-page`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      }
    );

    const rawText = await response.text();

    console.log("=== Evaluation BE Response ===");
    console.log("Status:", response.status);
    console.log("Body:", rawText);

    if (!rawText) {
      return NextResponse.json(
        {
          success: response.ok,
          message: response.ok
            ? "BE không trả dữ liệu."
            : `BE trả HTTP ${response.status}`,
        },
        {
          status: response.status,
        }
      );
    }

    let data: unknown;

    try {
      data = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "BE trả response không phải JSON.",
          rawResponse: rawText,
        },
        {
          status: 502,
        }
      );
    }

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error("Evaluation paged API error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Không thể tải danh sách bản đánh giá.",
      },
      { status: 500 }
    );
  }
}