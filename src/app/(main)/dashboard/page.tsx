"use client";

import React from "react";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import {
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileSpreadsheet,
  LayoutDashboard,
  PieChart,
  UserCircle2,
  Users,
  XCircle,
} from "lucide-react";
import {
  AppButton,
  MetricStrip,
  PageFrame,
  PageHeader,
} from "@/components/ds";
import { useAuth } from "@/features/auth/AuthProvider";

/**
 * Dashboard retains the 4 static KPI overview cards (2,900 / 1,200 / 800 / 400)
 * and 2 chart placeholder cards per locked project scope while upgrading visuals
 * to the Astryx + Deoca design system.
 */
export default function DashboardPage() {
  const { user } = useAuth();
  const displayName = user?.fullName || user?.username || "Thành viên DCG";

  return (
    <PageFrame>
      <PageHeader
        artwork="dashboard"
        icon={<LayoutDashboard className="h-5 w-5" />}
        eyebrow="Hệ thống quản trị KPI · Tập đoàn Đèo Cả"
        title={`Xin chào, ${displayName}`}
        description="Tổng quan tiến độ đánh giá hiệu suất KPI và lối tắt nhanh đến các khu vực làm việc."
        actions={
          <>
            <AppButton
              label="Đánh giá của tôi"
              variant="primary"
              icon={<ClipboardCheck className="h-4 w-4" />}
              href="/my-evaluation"
            />
            <AppButton
              label="Thông tin cá nhân"
              variant="secondary"
              icon={<UserCircle2 className="h-4 w-4" />}
              href="/user-infor"
            />
          </>
        }
      />

      <MetricStrip
        items={[
          {
            id: "total-employees",
            label: "Tổng số nhân sự",
            value: "2,900",
            hint: "Toàn hệ thống Tập đoàn Đèo Cả",
            tone: "blue",
            icon: <Users className="h-5 w-5" />,
          },
          {
            id: "evaluated",
            label: "Đã hoàn thành đánh giá",
            value: "1,200",
            hint: "Hồ sơ đã phê duyệt hoàn tất",
            tone: "green",
            icon: <CheckCircle2 className="h-5 w-5" />,
          },
          {
            id: "pending",
            label: "Đang chờ phê duyệt",
            value: "800",
            hint: "Đang luân chuyển qua QL / HR",
            tone: "orange",
            icon: <Clock className="h-5 w-5" />,
          },
          {
            id: "not-evaluated",
            label: "Chưa thực hiện",
            value: "400",
            hint: "Cần hoàn thiện trước hạn kỳ",
            tone: "red",
            icon: <XCircle className="h-5 w-5" />,
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card padding={5} elevation="low">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <Heading level={4}>Phân bổ xếp loại KPI theo đơn vị</Heading>
                <Text type="supporting">Biểu đồ thống kê đang chờ tích hợp API tổng hợp.</Text>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-subtle text-blue-vivid">
                <BarChart3 className="h-5 w-5" />
              </span>
            </div>
            <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 p-6 text-center">
              <BarChart3 className="h-8 w-8 text-secondary" />
              <div className="text-sm font-medium text-primary">
                Khu vực biểu đồ cột (Placeholder)
              </div>
              <p className="max-w-sm text-xs text-secondary">
                Sẵn sàng kết nối nguồn dữ liệu khi endpoint <code>/api/dashboard/summary</code> được mở ở backend.
              </p>
            </div>
          </div>
        </Card>

        <Card padding={5} elevation="low">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <Heading level={4}>Tỷ lệ hoàn thành theo trạng thái</Heading>
                <Text type="supporting">Tổng hợp tiến độ toàn tập đoàn theo kỳ hiện hành.</Text>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-red-subtle text-red-vivid">
                <PieChart className="h-5 w-5" />
              </span>
            </div>
            <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 p-6 text-center">
              <PieChart className="h-8 w-8 text-secondary" />
              <div className="text-sm font-medium text-primary">
                Khu vực biểu đồ tròn (Placeholder)
              </div>
              <p className="max-w-sm text-xs text-secondary">
                Hiển thị tỷ lệ hoàn thành, chờ duyệt và trả lại theo từng đơn vị thành viên.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card padding={4} elevation="low">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-primary">Truy cập nhanh quy trình KPI</div>
            <div className="text-xs text-secondary">
              Chuyển nhanh tới danh sách đánh giá cá nhân, hồ sơ chờ duyệt hoặc tổng hợp kỳ.
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AppButton
              label="Chờ duyệt (Quản lý)"
              variant="secondary"
              size="sm"
              href="/manager/pending"
            />
            <AppButton
              label="Chờ duyệt (HR)"
              variant="secondary"
              size="sm"
              href="/hr/pending"
            />
            <AppButton
              label="Tổng hợp HR"
              variant="secondary"
              size="sm"
              icon={<FileSpreadsheet className="h-4 w-4" />}
              href="/summary/summary-list/HrSummary"
            />
          </div>
        </div>
      </Card>
    </PageFrame>
  );
}
