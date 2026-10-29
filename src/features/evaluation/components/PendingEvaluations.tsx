"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  CalendarIcon,
  ChevronDownIcon,
  Cross2Icon,
  ClockIcon,
  EyeOpenIcon,
  FileTextIcon,
  InfoCircledIcon,
  MagnifyingGlassIcon,
  MixerHorizontalIcon,
  PersonIcon,
  ReloadIcon,
  ResetIcon,
} from "@radix-ui/react-icons";
import { pendingEvaluationApi } from "../services/pendingEvaluationApi";
import {
  UserRoleSystem,
  type EvaluationFilterOption,
  type EvaluationTypeOption,
  type PagedResult,
  type PendingEvaluationDto,
  type PendingEvaluationFilters,
} from "@/types/evaluation";
import styles from "../evaluation-common.module.css";
import pending from "../pending-evaluations.module.css";
import { Pagination } from "@/components/ui/pagination";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { notify } from "@/components/ui/toast";
import { evaluationLookupApi } from "../services/evaluationLookupApi";
import { formatEvaluationDate, requestMessage, companyOptions, periodOptions, evaluationTypeOptions } from "../evaluationDisplay";

const companyLogos: Record<string, string> = { BGLS: "/brand/bgls.png", TLMT: "/brand/tlmt.png" };

const emptyFilters: PendingEvaluationFilters = {
  keyword: "",
  companyId: "",
  departmentId: "",
  periodId: "",
};
export function PendingEvaluations({
  level,
}: {
  level: UserRoleSystem.ManagerMid | UserRoleSystem.HR;
}) {
  const hr = level === UserRoleSystem.HR;
  const title = hr ? "Danh sách chờ nhận xét" : "Danh sách NS chờ đánh giá";
  const pendingLabel = hr ? "Chờ nhận xét" : "Chờ đánh giá";
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState("submittedDate_desc");
  const [appliedSortBy, setAppliedSortBy] = useState("submittedDate_desc");
  const [revision, setRevision] = useState(0);
  const [snapshot, setSnapshot] = useState<{
    key: string;
    data: PagedResult<PendingEvaluationDto>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [companies, setCompanies] = useState<EvaluationFilterOption[]>([]);
  const [periods, setPeriods] = useState<EvaluationFilterOption[]>([]);
  const [evaluationTypes, setEvaluationTypes] = useState<EvaluationTypeOption[]>([]);
  const [typeId, setTypeId] = useState("");
  const [departments, setDepartments] = useState<EvaluationFilterOption[]>([]);
  const [lookupsBusy, setLookupsBusy] = useState(true);
  const [lookupError, setLookupError] = useState("");
  const [departmentBusy, setDepartmentBusy] = useState(false);
  const [departmentError, setDepartmentError] = useState("");
  const [lookupRevision, setLookupRevision] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [rejectTargets, setRejectTargets] = useState<PendingEvaluationDto[] | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectBusy, setRejectBusy] = useState(false);
  const [rejectError, setRejectError] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const advancedCount = Number(Boolean(typeId)) + Number(Boolean(filters.periodId));
  const rejectInFlight = useRef(false);
  const rejectDialogRef = useRef<HTMLDialogElement>(null);
  const requestKey = JSON.stringify({ level, page, pageSize, sortBy: appliedSortBy, ...applied });
  const ready = snapshot?.key === requestKey;
  const data = ready ? snapshot.data : null;
  const allSelected = Boolean(
    data?.items.length &&
      data.items.every((item) => selected.includes(`${item.id}:${item.stepId}`)),
  );
  const activeFilters = Object.values(applied).filter(Boolean).length;
  const availablePeriods =
    hr && typeId
      ? (evaluationTypes.find((type) => type.id === typeId)?.periods ?? []).filter((period) =>
          periods.some((available) => available.id === period.id),
        )
      : periods;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setSelected([]);
    pendingEvaluationApi
      .get({
        page,
        pageSize,
        level,
        filters: applied,
        sortBy: appliedSortBy,
        signal: controller.signal,
      })
      .then((result) => {
        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, Math.ceil(result.total / pageSize));
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setSnapshot({ key: requestKey, data: result });
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(requestMessage(cause, "Không tải được danh sách. Vui lòng thử lại."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [applied, appliedSortBy, level, page, pageSize, requestKey, revision]);

  useEffect(() => {
    const controller = new AbortController();
    setLookupsBusy(true);
    setLookupError("");
    Promise.allSettled([
      evaluationLookupApi.getCompanies(level, controller.signal),
      evaluationLookupApi.getPeriods(controller.signal),
      hr ? evaluationLookupApi.getTypes(controller.signal) : Promise.resolve([]),
    ]).then(([companyResult, periodResult, typeResult]) => {
      if (controller.signal.aborted) return;
      setCompanies(companyResult.status === "fulfilled" ? companyOptions(companyResult.value) : []);
      setPeriods(periodResult.status === "fulfilled" ? periodOptions(periodResult.value) : []);
      setEvaluationTypes(typeResult.status === "fulfilled" ? evaluationTypeOptions(typeResult.value) : []);
      const failed = [companyResult, periodResult, typeResult].find(
        (result) => result.status === "rejected",
      );
      if (failed?.status === "rejected")
        setLookupError(requestMessage(failed.reason, "Chưa tải được một số lựa chọn bộ lọc."));
      setLookupsBusy(false);
    });
    return () => controller.abort();
  }, [hr, level, lookupRevision]);

  useEffect(() => {
    const controller = new AbortController();
    setDepartments([]);
    setDepartmentError("");
    setDepartmentBusy(Boolean(filters.companyId));
    if (!filters.companyId) return () => controller.abort();
    evaluationLookupApi
      .getDepartments(filters.companyId, level, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setDepartments(periodOptions(result));
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setDepartmentError(requestMessage(cause, "Chưa tải được danh sách phòng ban."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setDepartmentBusy(false);
      });
    return () => controller.abort();
  }, [filters.companyId, level, lookupRevision]);

  useEffect(() => {
    if (!rejectTargets) return;
    const dialog = rejectDialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    dialog.querySelector("textarea")?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [rejectTargets]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (hr && typeId && !filters.periodId) {
      setAdvancedOpen(true);
      window.requestAnimationFrame(() => document.getElementById("pending-period-filter")?.focus());
      return;
    }
    setApplied({ ...filters, keyword: filters.keyword.trim() });
    setAppliedSortBy(sortBy);
    setPage(1);
  }

  function clearFilters() {
    setSortBy("submittedDate_desc");
    setAppliedSortBy("submittedDate_desc");
    setTypeId("");
    setFilters(emptyFilters);
    setApplied(emptyFilters);
    setPage(1);
    setRevision((value) => value + 1);
  }

  function openReject(targets: PendingEvaluationDto[]) {
    if (hr || !targets.length) return;
    setRejectReason("");
    setRejectError("");
    setRejectTargets(targets);
  }

  function closeReject() {
    if (!rejectInFlight.current) setRejectTargets(null);
  }

  async function submitReject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (hr || !rejectTargets || rejectInFlight.current) return;
    if (!rejectReason.trim()) {
      setRejectError("Vui lòng nhập lý do từ chối.");
      rejectDialogRef.current?.querySelector("textarea")?.focus();
      return;
    }

    rejectInFlight.current = true;
    setRejectBusy(true);
    setRejectError("");
    let completed = 0;
    try {
      for (const item of rejectTargets) {
        await pendingEvaluationApi.reviewAction(item.id, { Action: 2, Level: UserRoleSystem.ManagerMid, Comment: rejectReason.trim(), StepId: item.stepId });
        completed += 1;
      }
      setRejectTargets(null);
      notify("success", `Đã từ chối ${completed} bản đánh giá.`);
    } catch (cause) {
      setRejectTargets(rejectTargets.slice(completed));
      const message =
        cause instanceof Error && cause.message === "FORBIDDEN"
          ? "Bạn chưa có quyền từ chối bản đánh giá này."
          : requestMessage(cause, "Chưa từ chối được bản đánh giá. Vui lòng thử lại.");
      const feedback = completed ? `Đã từ chối ${completed}/${rejectTargets.length} bản. ${message}` : message;
      setRejectError(feedback);
      notify(completed ? "warning" : "error", feedback);
    } finally {
      if (completed) setRevision((value) => value + 1);
      rejectInFlight.current = false;
      setRejectBusy(false);
    }
  }

  return (
    <section className={styles.page + " " + pending.page} aria-labelledby="pending-title">
      <header className={pending.heading}>
        <div className={pending.titleLine}>
          <h1 id="pending-title">{title}</h1>
          <span className={pending.total}><strong>{data?.total.toLocaleString("vi-VN") ?? "—"}</strong>{hr ? "bản chờ nhận xét" : "bản chờ đánh giá"}</span>
        </div>
        <p className={pending.description}>{hr ? "Theo dõi các bản đánh giá đang chờ ý kiến nhân sự." : "Theo dõi các bản đánh giá của nhân sự đang chờ bạn xử lý."}</p>
      </header>

      <form className={styles.filters + " " + pending.filters} onSubmit={applyFilters} aria-label="Lọc danh sách chờ duyệt">
        <div className={pending.primaryFilters}>
          <label><span className={styles.srOnly}>Nhân viên</span><div className={styles.control + " " + pending.searchControl}>
            <MagnifyingGlassIcon aria-hidden="true" />
            <input type="search" value={filters.keyword} maxLength={200} placeholder="Tìm theo tên / mã NV" onChange={(event) => setFilters((value) => ({ ...value, keyword: event.target.value }))} />
          </div></label>
          <div className={pending.selectField}>
            <SearchableSelect id="pending-company-filter" label="Công ty" value={filters.companyId} options={companies} placeholder={lookupsBusy ? "Đang tải…" : "Tất cả công ty"} disabled={lookupsBusy || !companies.length} onChange={(companyId) => setFilters((value) => ({ ...value, companyId, departmentId: "" }))} />
          </div>
          <div className={pending.selectField}>
            <SearchableSelect id="pending-department-filter" label="Phòng ban" value={filters.departmentId} options={departments} placeholder={departmentBusy ? "Đang tải…" : !filters.companyId ? "Chọn công ty trước" : "Tất cả phòng ban"} disabled={!filters.companyId || departmentBusy || !departments.length} onChange={(departmentId) => setFilters((value) => ({ ...value, departmentId }))} />
          </div>
          <div className={pending.filterButtons}>
            <button className={styles.button + " " + pending.moreFilters} type="button" aria-expanded={advancedOpen} aria-controls="pending-extra-filters" onClick={() => setAdvancedOpen((value) => !value)}>
              <MixerHorizontalIcon aria-hidden="true" />Lọc thêm{advancedCount > 0 && <b>{advancedCount}</b>}<ChevronDownIcon aria-hidden="true" />
            </button>
            <button className={styles.button + " " + pending.clearButton} type="button" onClick={clearFilters} aria-label="Xóa bộ lọc" title="Xóa bộ lọc"><ResetIcon aria-hidden="true" /></button>
            <button className={styles.button + " " + pending.applyButton} type="submit" disabled={loading || Boolean(hr && typeId && !availablePeriods.length)}><MagnifyingGlassIcon aria-hidden="true" />{loading ? "Đang tải…" : "Áp dụng"}</button>
          </div>
        </div>
        <div id="pending-extra-filters" className={pending.advancedFilters} hidden={!advancedOpen}>
          {hr && <div className={pending.selectField}>
            <span>Loại đánh giá</span>
            <SearchableSelect id="pending-type-filter" label="Loại đánh giá" value={typeId} options={evaluationTypes} placeholder={lookupsBusy ? "Đang tải…" : "Tất cả loại đánh giá"} disabled={lookupsBusy || !evaluationTypes.length} onChange={(value) => { setTypeId(value); setFilters((current) => ({ ...current, periodId: "" })); }} />
          </div>}
          <div className={pending.selectField}>
            <span>Kỳ đánh giá{hr && typeId && " (bắt buộc)"}</span>
            <SearchableSelect id="pending-period-filter" label="Kỳ đánh giá" value={filters.periodId} options={availablePeriods} placeholder={lookupsBusy ? "Đang tải…" : hr && typeId ? availablePeriods.length ? "Chọn kỳ đánh giá" : "Loại này chưa có kỳ phù hợp" : "Tất cả kỳ đánh giá"} disabled={lookupsBusy || !availablePeriods.length} required={hr && Boolean(typeId)} onChange={(periodId) => setFilters((value) => ({ ...value, periodId }))} />
          </div>
          {hr && typeId && !filters.periodId && <p className={pending.filterHint} role="status">Chọn kỳ đánh giá để áp dụng loại đánh giá này.</p>}
        </div>
        {(lookupError || departmentError) && <div className={styles.error} role="alert"><InfoCircledIcon aria-hidden="true" /><span>{lookupError || departmentError}</span><button type="button" onClick={() => setLookupRevision((value) => value + 1)}>Thử lại</button></div>}
        {activeFilters > 0 && <div className={pending.appliedFilters}>
          <span>Đang lọc</span>
          {applied.keyword && <span>{applied.keyword}</span>}
          {applied.companyId && <span>{companies.find((option) => option.id === applied.companyId)?.name || applied.companyId}</span>}
          {applied.departmentId && <span>{departments.find((option) => option.id === applied.departmentId)?.name || applied.departmentId}</span>}
          {applied.periodId && <span>{periods.find((option) => option.id === applied.periodId)?.name || applied.periodId}</span>}
        </div>}
      </form>

      <div className={styles.inbox} aria-busy={loading}>
        <div className={styles.listHeading + " " + pending.listHeading}>
          <div>
            <span className={styles.listIcon + " " + pending.listIcon}><FileTextIcon aria-hidden="true" /></span>
            <h2>Bản đánh giá</h2><span className={styles.count}>{data?.total ?? "—"}</span>
            {selected.length > 0 && <span className={pending.selectionCount} role="status">Đã chọn {selected.length}</span>}
          </div>
          <div className={pending.listTools} data-hr={hr}>
            <label><span className={styles.srOnly}>Sắp xếp</span><div className={styles.control}>
              <select value={appliedSortBy} disabled={loading} onChange={(event) => { setSortBy(event.target.value); setAppliedSortBy(event.target.value); setPage(1); }}>
                <option value="submittedDate_desc">Mới gửi gần đây</option><option value="submittedDate_asc">Gửi lâu trước</option><option value="employee_asc">Tên A→Z</option><option value="employee_desc">Tên Z→A</option>
              </select><ChevronDownIcon aria-hidden="true" />
            </div></label>
            {!hr && <button className={styles.button + " " + pending.rejectButton + " " + pending.bulkReject} type="button" disabled={loading || !data || Boolean(error) || !selected.length} aria-haspopup="dialog" onClick={() => openReject(data?.items.filter((item) => selected.includes(`${item.id}:${item.stepId}`)) ?? [])}><Cross2Icon aria-hidden="true" />Từ chối ({selected.length})</button>}
            <button className={styles.refresh} type="button" title="Tải lại danh sách" aria-label="Tải lại danh sách" disabled={loading} onClick={() => setRevision((value) => value + 1)}><ReloadIcon aria-hidden="true" /></button>
          </div>
        </div>
        {error ? (
          <div className={styles.empty} role="alert">
            <span className={styles.emptyIcon}>
              <InfoCircledIcon aria-hidden="true" />
            </span>
            <h3>Chưa tải được danh sách</h3>
            <p>{error}</p>
            <button
              className={styles.button}
              type="button"
              onClick={() => setRevision((value) => value + 1)}
            >
              Thử lại
            </button>
            {error.includes("đăng nhập") && (
              <Link
                className={styles.loginLink}
                href={`/login?next=${hr ? "/hr/pending" : "/manager/pending"}`}
              >
                Đăng nhập lại
              </Link>
            )}
          </div>
        ) : loading || !ready ? (
          <div className={styles.loading} role="status">
            <span className={styles.srOnly}>Đang tải danh sách</span>
            {[0, 1, 2].map((row) => (
              <div key={row} className={styles.skeleton} aria-hidden="true">
                <i />
                <div>
                  <i />
                  <i />
                </div>
                <i />
              </div>
            ))}
          </div>
        ) : !data?.items.length ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>
              <FileTextIcon aria-hidden="true" />
            </span>
            <h3>{activeFilters ? "Chưa có kết quả phù hợp" : "Chưa có bản đánh giá chờ xử lý"}</h3>
            <p>
              {activeFilters
                ? "Thử thay đổi từ khóa hoặc bớt điều kiện lọc."
                : "Các bản đánh giá cần bạn xử lý sẽ xuất hiện tại đây."}
            </p>
            {activeFilters > 0 && (
              <button className={styles.button} type="button" onClick={clearFilters}>
                Xóa bộ lọc
              </button>
            )}
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={`${styles.table} ${pending.table}`}>
              <caption className={styles.srOnly}>{title}</caption>
              <thead>
                <tr>
                  <th scope="col" className={pending.selectionCell}>
                    <label className={pending.checkboxControl}>
                      <input
                        type="checkbox"
                        aria-label="Chọn tất cả bản đánh giá trên trang"
                        checked={allSelected}
                        ref={(element) => {
                          if (element) element.indeterminate = selected.length > 0 && !allSelected;
                        }}
                        onChange={(event) =>
                          setSelected(
                            event.target.checked
                              ? data.items.map((item) => `${item.id}:${item.stepId}`)
                              : [],
                          )
                        }
                      />
                      <span className={pending.selectionLabel}>Chọn tất cả trên trang</span>
                    </label>
                  </th>
                  <th scope="col" className={pending.employeeColumn}>
                    Nhân viên
                  </th>
                  <th scope="col" className={pending.companyColumn}>
                    Đơn vị
                  </th>
                  <th scope="col" className={pending.periodColumn}>
                    Kỳ đánh giá
                  </th>
                  <th scope="col" className={pending.dateColumn}>
                    Ngày gửi / duyệt cuối
                  </th>
                  <th scope="col" className={pending.statusColumn}>
                    Trạng thái
                  </th>
                  <th scope="col" className={pending.actionsColumn}>
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr
                    key={`${item.id}:${item.stepId}`}
                    data-selected={selected.includes(`${item.id}:${item.stepId}`)}
                  >
                    <td className={pending.selectionCell}>
                      <label className={pending.checkboxControl}>
                        <input
                          type="checkbox"
                          aria-label={`Chọn bản đánh giá của ${item.userName || item.sysTemCode || "nhân viên"}`}
                          checked={selected.includes(`${item.id}:${item.stepId}`)}
                          onChange={(event) =>
                            setSelected((value) =>
                              event.target.checked
                                ? [...value, `${item.id}:${item.stepId}`]
                                : value.filter((key) => key !== `${item.id}:${item.stepId}`),
                            )
                          }
                        />
                        <span className={pending.selectionLabel}>Chọn bản đánh giá</span>
                      </label>
                    </td>
                    <td data-label="Nhân viên" className={pending.employeeCell}>
                      <div className={styles.employee}>
                        <span className={styles.avatar} aria-hidden="true">
                          <PersonIcon aria-hidden="true" />
                        </span>
                        <div>
                          <strong>{item.userName || "Chưa có tên"}</strong>
                          <span>{item.sysTemCode || item.userCode}</span>
                        </div>
                      </div>
                    </td>
                    <td data-label="Đơn vị" className={pending.organizationCell}>
                      <span className={pending.companyIdentity}><Image className={pending.companyLogo} src={companyLogos[item.companyCode?.trim().toUpperCase() ?? ""] ?? "/brand/deoca-icon.png"} alt="" width={32} height={32} /><span className={pending.company}>{item.companyCode || "—"}</span></span><span className={pending.department}>{item.departmentName || "—"}</span>
                    </td>
                    <td data-label="Kỳ đánh giá" className={pending.periodCell}>
                      <div className={pending.periodIdentity}><span className={pending.periodIcon} aria-hidden="true"><CalendarIcon /></span><span className={pending.period}>{item.periodLabel || "—"}</span></div>
                    </td>
                    <td data-label="Ngày gửi / duyệt cuối" className={pending.dateCell}>
                      <span className={pending.date}><ClockIcon aria-hidden="true" /><time
                        dateTime={
                          formatEvaluationDate(item.submittedDate, "")
                            ? item.submittedDate!
                            : undefined
                        }
                      >
                        {formatEvaluationDate(item.submittedDate, "") || "—"}
                      </time></span>
                    </td>
                    <td data-label="Trạng thái" className={pending.statusCell}>
                      <span className={styles.status + " " + pending.status} data-rejected={item.isRejected}>
                        <i aria-hidden="true" />
                        {item.isRejected ? "Bị từ chối" : pendingLabel}
                      </span>
                      {item.isRejected && item.reason && (
                        <span className={pending.reason}>{item.reason}</span>
                      )}
                    </td>
                    <td data-label="Thao tác" className={pending.actionsCell}>
                      <div className={pending.rowActions}>
                        <button
                          className={`${styles.button} ${styles.viewButton}`}
                          type="button"
                          aria-label={`Xem thông tin bản đánh giá của ${item.userName || item.sysTemCode || "nhân viên"}`}
                          disabled
                        >
                          <EyeOpenIcon aria-hidden="true" />
                          Xem
                        </button>
                        {!hr && (
                          <button
                            className={`${styles.button} ${pending.rejectButton}`}
                            type="button"
                            aria-label={`Từ chối bản đánh giá của ${item.userName || item.sysTemCode || "nhân viên"}`}
                            aria-haspopup="dialog"
                            onClick={() => openReject([item])}
                          >
                            <Cross2Icon aria-hidden="true" />
                            Từ chối
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          itemLabel="bản đánh giá"
          page={page}
          pageSize={pageSize}
          total={data?.total ?? null}
          loading={loading}
          error={Boolean(error)}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>
      {!hr && rejectTargets && (
        <dialog
          ref={rejectDialogRef}
          className={pending.rejectDialog}
          aria-labelledby="reject-title"
          onCancel={(event) => {
            event.preventDefault();
            closeReject();
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) closeReject();
          }}
        >
          <form onSubmit={submitReject} aria-busy={rejectBusy}>
            <header className={pending.rejectHeader}>
              <h2 id="reject-title">Lý do từ chối</h2>
              <button
                className={styles.refresh}
                type="button"
                aria-label="Đóng lý do từ chối"
                disabled={rejectBusy}
                onClick={closeReject}
              >
                <Cross2Icon aria-hidden="true" />
              </button>
            </header>
            <div className={pending.rejectBody}>
              <p>
                {rejectTargets.length === 1
                  ? rejectTargets[0].userName || rejectTargets[0].sysTemCode || "Nhân viên"
                  : `${rejectTargets.length} bản đánh giá đã chọn`}
              </p>
              <label htmlFor="reject-reason">Lý do</label>
              <textarea
                id="reject-reason"
                rows={4}
                placeholder="Nhập lý do từ chối…"
                required
                value={rejectReason}
                disabled={rejectBusy}
                aria-describedby={rejectError ? "reject-error" : undefined}
                onChange={(event) => setRejectReason(event.target.value)}
              />
              {rejectError && (
                <div id="reject-error" className={styles.error} role="alert">
                  {rejectError}
                </div>
              )}
            </div>
            <footer className={pending.rejectFooter}>
              <button
                className={styles.button}
                type="button"
                disabled={rejectBusy}
                onClick={closeReject}
              >
                Đóng
              </button>
              <button
                className={`${styles.button} ${pending.rejectButton}`}
                type="submit"
                disabled={rejectBusy}
              >
                {rejectBusy ? "Đang từ chối…" : "Xác nhận từ chối"}
              </button>
            </footer>
          </form>
        </dialog>
      )}
    </section>
  );
}
