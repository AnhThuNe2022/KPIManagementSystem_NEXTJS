"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { BackpackIcon, CalendarIcon, CheckIcon, DownloadIcon, EyeOpenIcon, FileTextIcon, PersonIcon, ReloadIcon, ResetIcon, StarIcon } from "@radix-ui/react-icons";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { notify } from "@/components/ui/Toaster";
import { Pagination } from "@/components/ui/Pagination";
import { companyApi } from "@/features/company/services/companyApi";
import { companyLogos } from "@/features/company/companyLogos";
import { evaluationLookupApi } from "@/features/evaluation/services/evaluationLookupApi";
import { companyOptions, evaluationTypeOptions, requestMessage } from "@/features/evaluation/evaluationDisplay";
import type { EvaluationFilterOption, EvaluationTypeOption } from "@/features/evaluation/types";
import type { PagedResult } from "@/lib/api/types";
import type { SummaryFilters, SummaryMode, SummaryRow } from "../types";
import { summaryApi } from "../services/summaryApi";
import "./SummaryList.css";

const emptyFilters: SummaryFilters = { companyIds: [], typeId: "", periodId: "", jobPositionId: "" };
const jobPositions = [
  { id: "1", name: "Nhân viên", icon: <PersonIcon aria-hidden="true" /> },
  { id: "2", name: "Quản lý cấp trung", icon: <BackpackIcon aria-hidden="true" /> },
  { id: "3", name: "Quản lý cấp cao", icon: <StarIcon aria-hidden="true" /> },
];

export function SummaryList({ mode }: { mode: SummaryMode }) {
  const scopeName = mode === "HrSummary" ? "HR" : "Director";
  const [filters, setFilters] = useState<SummaryFilters>(emptyFilters);
  const [companies, setCompanies] = useState<EvaluationFilterOption[]>([]);
  const [types, setTypes] = useState<EvaluationTypeOption[]>([]);
  const [lookupBusy, setLookupBusy] = useState(true);
  const [lookupError, setLookupError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [revision, setRevision] = useState(0);
  const [exportState, setExportState] = useState<"idle" | "loading" | "complete">("idle");
  const exporting = exportState === "loading";
  const exportController = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState<{ key: string; data: PagedResult<SummaryRow> } | null>(null);

  const requestKey = JSON.stringify({ mode, page, pageSize, filters });
  const data = snapshot?.key === requestKey ? snapshot.data : null;
  const maxTotal = Math.max(1, ...(data?.items.map(row => row.totalEval) ?? []));
  const periods = types.find(type => type.id === filters.typeId)?.periods ?? [];
  const filtered = filters.companyIds.length > 0 || !!(filters.typeId || filters.periodId || filters.jobPositionId);

  useEffect(() => {
    const controller = new AbortController();
    setLookupBusy(true);
    setLookupError("");
    Promise.allSettled([
      mode === "HrSummary"
        ? companyApi.getForHrCompile(controller.signal)
        : companyApi.getAll(controller.signal),
      evaluationLookupApi.getTypes(controller.signal),
    ]).then(([companyResult, typeResult]) => {
      if (controller.signal.aborted) return;
      setCompanies(companyResult.status === "fulfilled" ? companyOptions(companyResult.value) : []);
      setTypes(typeResult.status === "fulfilled" ? evaluationTypeOptions(typeResult.value) : []);
      const failed = [companyResult, typeResult].find(result => result.status === "rejected");
      if (failed?.status === "rejected") {
        setLookupError(requestMessage(failed.reason, "Chưa tải đủ lựa chọn bộ lọc. Vui lòng làm mới."));
      }
      setLookupBusy(false);
    });
    return () => controller.abort();
  }, [mode, revision]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    summaryApi.list(mode, page, pageSize, filters, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      const lastPage = Math.max(1, Math.ceil(result.total / pageSize));
      if (page > lastPage) { setPage(lastPage); return; }
      setSnapshot({ key: requestKey, data: result });
    }).catch(cause => {
      if (!controller.signal.aborted) {
        setError(requestMessage(cause, "Chưa tải được danh sách tổng hợp. Vui lòng thử lại."));
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [mode, filters, requestKey, page, pageSize, revision]);

  useEffect(() => () => exportController.current?.abort(), []);

  useEffect(() => {
    if (exportState !== "complete") return;
    const timer = setTimeout(() => setExportState("idle"), 1200);
    return () => clearTimeout(timer);
  }, [exportState]);

  async function exportExcel() {
    if (!filters.typeId || !filters.periodId || !data?.total || exportController.current) return;
    const controller = new AbortController();
    exportController.current = controller;
    setExportState("loading");
    try {
      const groups = data.items.length === data.total
        ? data
        : await summaryApi.list(mode, 1, data.total, filters, controller.signal);
      controller.signal.throwIfAborted();
      if (!groups.items.length || groups.items.length !== groups.total) {
        throw new Error("Chưa lấy đủ nhóm tổng hợp. Vui lòng làm mới và xuất lại.");
      }
      const [result, template, workbook] = await Promise.all([
        summaryApi.detail(mode, groups.items.map(row => row.periodId), filters.companyIds, controller.signal),
        fetch("/excel/danh_sach_tong_hop_hr_template.xlsx", { signal: controller.signal }),
        import("../summaryExport"),
      ]);
      controller.signal.throwIfAborted();
      if (!template.ok) throw new Error("Chưa tải được mẫu Excel.");
      if (!result.total) {
        notify("info", "Không có bản đánh giá chi tiết để xuất.");
        return;
      }
      if (result.items.length !== result.total) throw new Error("Chưa lấy đủ dữ liệu chi tiết để xuất Excel.");
      const templateData = await template.arrayBuffer();
      controller.signal.throwIfAborted();
      const blob = workbook.createSummaryWorkbook(result.items, templateData);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "danh-sach-tong-hop-" + (mode === "HrSummary" ? "hr" : "director") + "-" + new Date().toISOString().slice(0, 10) + ".xlsx";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportState("complete");
      notify("success", "Đã xuất " + result.items.length + " bản đánh giá theo mẫu.");
    } catch (cause) {
      if (!controller.signal.aborted) notify("error", requestMessage(cause, cause instanceof Error ? cause.message : "Chưa xuất được Excel. Vui lòng thử lại."));
    } finally {
      exportController.current = null;
      if (!controller.signal.aborted) setExportState(state => state === "loading" ? "idle" : state);
    }
  }

  function resetFilters() {
    setFilters(emptyFilters);
    setPage(1);
  }

  return (
    <div className="hr-summary__page">
      <header className="hr-summary__heading">
        <div>
          <h1>Danh sách tổng hợp</h1>
          <p>Tổng hợp bản đánh giá theo kỳ, biểu mẫu và công ty.</p>
        </div>
        <div className="hr-summary__headingActions">
          <button type="button" className="hr-summary__button hr-summary__export" data-state={exportState} onClick={exportExcel} disabled={loading || !!error || !data?.total || exporting || !filters.typeId || !filters.periodId} aria-busy={exporting} title={filters.typeId && filters.periodId ? "Xuất Excel theo bộ lọc hiện tại" : "Chọn loại đánh giá và kỳ đánh giá để xuất Excel"}>
            <span className="hr-summary__exportGlyph" aria-hidden="true"><DownloadIcon /><CheckIcon /></span>
            <span role="status">{exporting ? "Đang xuất…" : exportState === "complete" ? "Đã xuất Excel" : "Xuất Excel"}</span>
          </button>
          <button type="button" className="hr-summary__refresh" aria-label="Làm mới danh sách tổng hợp" title="Làm mới" disabled={loading} onClick={() => setRevision(value => value + 1)}>
            <ReloadIcon className={loading ? "hr-summary__spinning" : undefined} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="hr-summary__filters" role="group" aria-label="Bộ lọc tổng hợp">
        <div className="hr-summary__filterFields">
          <div className="hr-summary__field">
            <label htmlFor="summary-company">Công ty</label>
            <SearchableSelect id="summary-company" label="Công ty" placeholder="Tất cả công ty" multiple value={filters.companyIds} options={companies} disabled={lookupBusy} onChange={companyIds => { setFilters(current => ({ ...current, companyIds })); setPage(1); }} />
          </div>
          <div className="hr-summary__field">
            <label htmlFor="summary-type">Loại đánh giá</label>
            <SearchableSelect id="summary-type" label="Loại đánh giá" placeholder="Tất cả loại đánh giá" value={filters.typeId} options={types} disabled={lookupBusy} onChange={typeId => { setFilters(current => ({ ...current, typeId, periodId: "" })); setPage(1); }} />
          </div>
          <div className="hr-summary__field">
            <label htmlFor="summary-period">Kỳ đánh giá</label>
            <SearchableSelect id="summary-period" label="Kỳ đánh giá" placeholder={filters.typeId ? "Tất cả kỳ đánh giá" : "Chọn loại đánh giá trước"} value={filters.periodId} options={periods} disabled={lookupBusy || !filters.typeId} onChange={periodId => { setFilters(current => ({ ...current, periodId })); setPage(1); }} />
          </div>
          <div className="hr-summary__field">
            <label htmlFor="summary-position">Vị trí công việc</label>
            <SearchableSelect id="summary-position" label="Vị trí công việc" placeholder="Tất cả vị trí" value={filters.jobPositionId} options={jobPositions} onChange={jobPositionId => { setFilters(current => ({ ...current, jobPositionId })); setPage(1); }} />
          </div>
        </div>
        <div className="hr-summary__filterFooter">
          <p role="status">{lookupBusy ? "Đang tải lựa chọn bộ lọc…" : filters.companyIds.length ? filters.companyIds.length + " công ty đang được chọn" : mode === "HrSummary" ? "Các công ty thuộc phạm vi HR của bạn" : "Tất cả công ty"}</p>
          <div className="hr-summary__filterActions">
            <button type="button" className="hr-summary__button" onClick={resetFilters} disabled={!filtered}><ResetIcon aria-hidden="true" />Xóa lọc</button>
          </div>
        </div>
        {lookupError && <p className="hr-summary__lookupError" role="alert">{lookupError}</p>}
      </div>

      <section className="hr-summary__results" aria-labelledby="summary-results-heading">
        <header className="hr-summary__resultsHeader">
          <h2 id="summary-results-heading"><FileTextIcon aria-hidden="true" />Kết quả tổng hợp <span>{data?.total.toLocaleString("vi-VN") ?? "—"}</span></h2>
          {filtered && <span className="hr-summary__filtered">Đã áp dụng bộ lọc</span>}
        </header>
        <div className="hr-summary__tableWrap" aria-busy={loading}>
          <table className="hr-summary__table" aria-label="Danh sách tổng hợp đánh giá">
            <thead><tr><th scope="col">Kỳ đánh giá</th><th scope="col">Biểu mẫu</th><th scope="col">Nhóm chức danh</th><th scope="col">Công ty</th><th scope="col" className="hr-summary__number">Tổng cộng</th><th scope="col"><span className="hr-summary__srOnly">Thao tác</span></th></tr></thead>
            <tbody>
              {data?.items.map((row, index) => (
                <tr key={row.periodId + "-" + row.companyId + "-" + row.jobPosition} style={{ animationDelay: Math.min(index * 40, 240) + "ms" }}>
                  <td data-label="Kỳ đánh giá"><div className="hr-summary__period"><span className="hr-summary__periodIcon"><CalendarIcon aria-hidden="true" /></span><strong>{row.period}</strong></div></td>
                  <td data-label="Biểu mẫu"><span className="hr-summary__template">{row.periodName}</span></td>
                  <td data-label="Nhóm chức danh"><span className="hr-summary__role" data-position={row.jobPosition}>{jobPositions.find(position => position.name === row.jobPosition)?.icon}{row.jobPosition}</span></td>
                  <td data-label="Công ty"><span className="hr-summary__company"><Image src={companyLogos[row.companyName] ?? "/brand/deoca-icon.png"} alt="" width={23} height={23} /><strong>{row.companyName}</strong></span></td>
                  <td data-label="Tổng cộng" className="hr-summary__number"><div className="hr-summary__total"><span className="hr-summary__totalTrack" role="meter" aria-label="Số bản đánh giá so với nhóm lớn nhất trên trang" aria-valuemin={0} aria-valuemax={maxTotal} aria-valuenow={row.totalEval} title="So với nhóm có nhiều bản đánh giá nhất trên trang"><span style={{ width: (row.totalEval / maxTotal * 100) + "%", animationDelay: Math.min(index * 40, 240) + 80 + "ms" }} /></span><strong>{row.totalEval.toLocaleString("vi-VN")}</strong></div></td>
                  <td><button type="button" className="hr-summary__view" disabled title="Chức năng xem chi tiết sẽ được bổ sung sau"><EyeOpenIcon aria-hidden="true" />Xem</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {(loading || error || !data?.items.length) && <div className="hr-summary__state" role={error ? "alert" : "status"}>
            {loading ? <><ReloadIcon className="hr-summary__spinning" aria-hidden="true" /><p>Đang tải danh sách tổng hợp…</p></> : error ? <><p>{error}</p><button type="button" className="hr-summary__button" onClick={() => setRevision(value => value + 1)}>Thử lại</button></> : <><FileTextIcon aria-hidden="true" /><h3>Chưa có kết quả tổng hợp</h3><p>{filtered ? "Thử thay đổi công ty, kỳ hoặc vị trí công việc." : "Danh sách sẽ hiển thị khi có bản đánh giá trong phạm vi " + scopeName + "."}</p>{filtered && <button type="button" className="hr-summary__button" onClick={resetFilters}>Xóa bộ lọc</button>}</>}
          </div>}
        </div>
        <Pagination page={page} pageSize={pageSize} total={data?.total ?? null} loading={loading} error={!!error} itemLabel="nhóm tổng hợp" onPageChange={setPage} onPageSizeChange={size => { setPageSize(size); setPage(1); }} />
      </section>
    </div>
  );
}
