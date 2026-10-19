"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  CalendarIcon,
  ChevronDownIcon,
  Cross2Icon,
  EyeOpenIcon,
  FileTextIcon,
  InfoCircledIcon,
  MagnifyingGlassIcon,
  MixerHorizontalIcon,
  PersonIcon,
  ReloadIcon,
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
import { EvaluationPagination } from "./EvaluationPagination";
import { evaluationLookupApi } from "../services/evaluationLookupApi";
import { formatEvaluationDate, requestMessage } from "../evaluationDisplay";

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
      setCompanies(companyResult.status === "fulfilled" ? companyResult.value : []);
      setPeriods(periodResult.status === "fulfilled" ? periodResult.value : []);
      setEvaluationTypes(typeResult.status === "fulfilled" ? typeResult.value : []);
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
        if (!controller.signal.aborted) setDepartments(result);
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

  return (
    <section className={styles.page} aria-labelledby="pending-title">
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>
            <i aria-hidden="true" />
            {hr ? "Quản lý nhân sự" : "Quản lý"}
          </p>
          <h1 id="pending-title">{title}</h1>
          <p className={styles.description}>
            {hr
              ? "Theo dõi các bản đánh giá đang chờ ý kiến nhân sự."
              : "Theo dõi các bản đánh giá của nhân sự đang chờ bạn xử lý."}
          </p>
        </div>
        <div className={styles.totalCard}>
          <span className={styles.totalIcon}>
            <FileTextIcon aria-hidden="true" />
          </span>
          <div>
            <strong>{data?.total ?? "—"}</strong>
            <span>{hr ? "bản chờ nhận xét" : "bản chờ đánh giá"}</span>
          </div>
        </div>
      </header>

      <form className={styles.filters} onSubmit={applyFilters} aria-label="Lọc danh sách chờ duyệt">
        <div className={styles.filterHeading}>
          <span>
            <MixerHorizontalIcon aria-hidden="true" />
            Bộ lọc{activeFilters > 0 && <b>{activeFilters}</b>}
          </span>
          <span>Thu hẹp danh sách bạn cần xem</span>
        </div>
        <div className={styles.fields}>
          <label>
            <span>Nhân viên</span>
            <div className={styles.control}>
              <MagnifyingGlassIcon aria-hidden="true" />
              <input
                type="search"
                value={filters.keyword}
                maxLength={200}
                placeholder="Tìm theo tên / mã NV"
                onChange={(event) =>
                  setFilters((value) => ({ ...value, keyword: event.target.value }))
                }
              />
            </div>
          </label>
          <label>
            <span>Công ty</span>
            <div className={styles.control}>
              <select
                value={filters.companyId}
                disabled={lookupsBusy || !companies.length}
                onChange={(event) =>
                  setFilters((value) => ({
                    ...value,
                    companyId: event.target.value,
                    departmentId: "",
                  }))
                }
              >
                <option value="">{lookupsBusy ? "Đang tải…" : "Tất cả công ty"}</option>
                {companies.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
              <ChevronDownIcon aria-hidden="true" />
            </div>
          </label>
          <label>
            <span>Phòng ban</span>
            <div className={styles.control}>
              <select
                value={filters.departmentId}
                disabled={!filters.companyId || departmentBusy || !departments.length}
                onChange={(event) =>
                  setFilters((value) => ({ ...value, departmentId: event.target.value }))
                }
              >
                <option value="">
                  {departmentBusy
                    ? "Đang tải…"
                    : !filters.companyId
                      ? "Chọn công ty trước"
                      : "Tất cả phòng ban"}
                </option>
                {departments.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
              <ChevronDownIcon aria-hidden="true" />
            </div>
          </label>
          {hr && (
            <label>
              <span>Loại đánh giá</span>
              <div className={styles.control}>
                <select
                  value={typeId}
                  disabled={lookupsBusy || !evaluationTypes.length}
                  onChange={(event) => {
                    setTypeId(event.target.value);
                    setFilters((value) => ({ ...value, periodId: "" }));
                  }}
                >
                  <option value="">{lookupsBusy ? "Đang tải…" : "Tất cả loại đánh giá"}</option>
                  {evaluationTypes.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon aria-hidden="true" />
              </div>
            </label>
          )}
          <label>
            <span>Kỳ đánh giá{hr && typeId && " (bắt buộc)"}</span>
            <div className={styles.control}>
              <select
                value={filters.periodId}
                required={hr && Boolean(typeId)}
                disabled={lookupsBusy || !availablePeriods.length}
                onChange={(event) =>
                  setFilters((value) => ({ ...value, periodId: event.target.value }))
                }
              >
                <option value="">
                  {lookupsBusy
                    ? "Đang tải…"
                    : hr && typeId
                      ? availablePeriods.length
                        ? "Chọn kỳ đánh giá"
                        : "Loại này chưa có kỳ phù hợp"
                      : "Tất cả kỳ đánh giá"}
                </option>
                {availablePeriods.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
              <ChevronDownIcon aria-hidden="true" />
            </div>
          </label>
          <label>
            <span>Sắp xếp</span>
            <div className={styles.control}>
              <select
                value={sortBy}
                disabled={loading}
                onChange={(event) => setSortBy(event.target.value)}
              >
                <option value="submittedDate_desc">Mới gửi gần đây</option>
                <option value="submittedDate_asc">Gửi lâu trước</option>
                <option value="employee_asc">Tên A→Z</option>
                <option value="employee_desc">Tên Z→A</option>
              </select>
              <ChevronDownIcon aria-hidden="true" />
            </div>
          </label>
        </div>
        {(lookupError || departmentError) && (
          <div className={styles.error} role="alert">
            <InfoCircledIcon aria-hidden="true" />
            <span>{lookupError || departmentError}</span>
            <button type="button" onClick={() => setLookupRevision((value) => value + 1)}>
              Thử lại
            </button>
          </div>
        )}
        <div className={styles.filterActions}>
          <button className={styles.button} type="button" onClick={clearFilters}>
            <Cross2Icon aria-hidden="true" />
            Xóa lọc
          </button>
          <button
            className={`${styles.button} ${styles.primary}`}
            type="submit"
            disabled={loading || Boolean(hr && typeId && !availablePeriods.length)}
          >
            <MagnifyingGlassIcon aria-hidden="true" />
            {loading ? "Đang tải…" : "Lọc danh sách"}
          </button>
        </div>
      </form>

      <div className={styles.inbox} aria-busy={loading}>
        <div className={styles.listHeading}>
          <div>
            <span className={styles.listIcon}>
              <FileTextIcon aria-hidden="true" />
            </span>
            <h2>Bản đánh giá</h2>
            <span className={styles.count}>{data?.total ?? "—"}</span>
            {selected.length > 0 && (
              <span className={pending.selectionCount} role="status">
                Đã chọn {selected.length}
              </span>
            )}
          </div>
          <button
            className={`${styles.button} ${pending.rejectButton} ${pending.bulkReject}`}
            type="button"
            disabled={loading || !data || Boolean(error) || !selected.length}
            aria-haspopup="dialog"
            onClick={() =>
              setRejectTargets(
                data?.items.filter((item) => selected.includes(`${item.id}:${item.stepId}`)) ??
                  null,
              )
            }
          >
            <Cross2Icon aria-hidden="true" />
            Từ chối ({selected.length})
          </button>
          <button
            className={styles.refresh}
            type="button"
            title="Tải lại danh sách"
            aria-label="Tải lại danh sách"
            disabled={loading}
            onClick={() => setRevision((value) => value + 1)}
          >
            <ReloadIcon aria-hidden="true" />
          </button>
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
                    <PersonIcon aria-hidden="true" />
                    Nhân viên
                  </th>
                  <th scope="col" className={pending.companyColumn}>
                    Đơn vị
                  </th>
                  <th scope="col" className={pending.departmentColumn}>
                    Phòng ban
                  </th>
                  <th scope="col" className={pending.periodColumn}>
                    <FileTextIcon aria-hidden="true" />
                    Kỳ đánh giá
                  </th>
                  <th scope="col" className={pending.dateColumn}>
                    <CalendarIcon aria-hidden="true" />
                    Ngày gửi / duyệt cuối
                  </th>
                  <th scope="col" className={pending.statusColumn}>
                    Trạng thái
                  </th>
                  <th scope="col" className={pending.actionsColumn}>
                    <EyeOpenIcon aria-hidden="true" />
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
                          {(item.userName || "N").trim().charAt(0).toLocaleUpperCase("vi")}
                        </span>
                        <div>
                          <strong>{item.userName || "Chưa có tên"}</strong>
                          <span>{item.sysTemCode || item.userCode}</span>
                        </div>
                      </div>
                    </td>
                    <td data-label="Đơn vị">
                      <span className={pending.company}>{item.companyCode || "—"}</span>
                    </td>
                    <td data-label="Phòng ban">{item.departmentName || "—"}</td>
                    <td data-label="Kỳ đánh giá" className={pending.periodCell}>
                      <span className={styles.period}>{item.periodLabel || "—"}</span>
                    </td>
                    <td data-label="Ngày gửi / duyệt cuối">
                      <time
                        dateTime={
                          formatEvaluationDate(item.submittedDate, "")
                            ? item.submittedDate!
                            : undefined
                        }
                      >
                        {formatEvaluationDate(item.submittedDate, "")}
                      </time>
                    </td>
                    <td data-label="Trạng thái">
                      <span className={styles.status} data-rejected={item.isRejected}>
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
                            onClick={() => setRejectTargets([item])}
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
        <EvaluationPagination
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
      {rejectTargets && (
        <dialog
          ref={rejectDialogRef}
          className={pending.rejectDialog}
          aria-labelledby="reject-title"
          onCancel={() => setRejectTargets(null)}
          onClick={(event) => {
            if (event.target === event.currentTarget) setRejectTargets(null);
          }}
        >
          <div>
            <header className={pending.rejectHeader}>
              <h2 id="reject-title">Lý do từ chối</h2>
              <button
                className={styles.refresh}
                type="button"
                aria-label="Đóng lý do từ chối"
                onClick={() => setRejectTargets(null)}
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
              <textarea id="reject-reason" rows={4} placeholder="Nhập lý do từ chối…" />
            </div>
            <footer className={pending.rejectFooter}>
              <button
                className={styles.button}
                type="button"
                onClick={() => setRejectTargets(null)}
              >
                Đóng
              </button>
            </footer>
          </div>
        </dialog>
      )}
    </section>
  );
}
