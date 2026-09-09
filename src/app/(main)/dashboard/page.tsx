export default function DashboardPage() {
  return (
    <div className="p-6">

      <div className="mx-auto w-full max-w-7xl">

        {/* Header Dashboard */}
        <div className="mb-8">
          <p className="text-sm font-semibold text-[rgb(var(--color-accent))]">
            KPI Management System
          </p>

          <h1 className="mt-2 text-3xl font-semibold">
            Dashboard
          </h1>

          <p className="mt-2 text-[rgb(var(--color-muted))]">
            Tổng quan tình hình đánh giá KPI
          </p>
        </div>

        {/* Cards */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

          <DashboardCard
            title="Tổng nhân sự"
            value="2,900"
            description="Nhân sự đang sử dụng hệ thống"
          />

          <DashboardCard
            title="Tổng phiếu đánh giá"
            value="1,200"
            description="Tổng số phiếu đánh giá"
          />

          <DashboardCard
            title="Đã hoàn thành"
            value="800"
            description="Phiếu đã hoàn thành"
          />

          <DashboardCard
            title="Đang chờ duyệt"
            value="400"
            description="Phiếu đang chờ xử lý"
          />

        </div>

        {/* Charts */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">

          <section className="rounded-2xl bg-[rgb(var(--color-surface))] p-6 shadow-[var(--shadow-card)] lg:col-span-2">
            <h2 className="text-lg font-semibold">
              Tình hình đánh giá KPI
            </h2>

            <p className="mt-2 text-sm text-[rgb(var(--color-muted))]">
              Khu vực biểu đồ Dashboard
            </p>
          </section>

          <section className="rounded-2xl bg-[rgb(var(--color-surface))] p-6 shadow-[var(--shadow-card)]">
            <h2 className="text-lg font-semibold">
              Trạng thái đánh giá
            </h2>

            <p className="mt-2 text-sm text-[rgb(var(--color-muted))]">
              Khu vực thống kê trạng thái
            </p>
          </section>

        </div>

      </div>

    </div>
  );
}

function DashboardCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl bg-[rgb(var(--color-surface))] p-6 shadow-[var(--shadow-card)]">
      <p className="text-sm text-[rgb(var(--color-muted))]">
        {title}
      </p>

      <p className="mt-3 text-3xl font-semibold">
        {value}
      </p>

      <p className="mt-2 text-xs text-[rgb(var(--color-muted))]">
        {description}
      </p>
    </div>
  );
} 