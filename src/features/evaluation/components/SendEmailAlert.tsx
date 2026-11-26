"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import {
  CalendarIcon,
  CheckCircledIcon,
  Component1Icon,
  EnvelopeClosedIcon,
  ExclamationTriangleIcon,
  FileTextIcon,
  IdCardIcon,
  MagnifyingGlassIcon,
  PaperPlaneIcon,
  PersonIcon,
  ReloadIcon,
  ResetIcon,
} from "@radix-ui/react-icons";
import { FloatingSelectionBar, type FloatingSelectionAction } from "@/components/ui/FloatingSelectionBar";
import { Pagination } from "@/components/ui/Pagination";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { notify } from "@/components/ui/Toaster";
import { companyLogos } from "@/features/company/companyLogos";
import type { PagedResult } from "@/lib/api/types";
import { hrStatusLabel, requestMessage } from "../evaluationDisplay";
import { emailAlertApi, type EmailAlertItem } from "../services/emailAlertApi";
import { evaluationLookupApi } from "../services/evaluationLookupApi";
import type { EvaluationTypeDto } from "../types";
import "../evaluation-common.css";
import "./SendEmailAlert.css";

interface AppliedQuery {
  evaluationTypeId: number;
  periodId: number;
  status: number;
}

const numberFormat = new Intl.NumberFormat("vi-VN");

export function SendEmailAlert() {
  const [types, setTypes] = useState<EvaluationTypeDto[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [typesError, setTypesError] = useState("");
  const [typesRevision, setTypesRevision] = useState(0);

  const [typeId, setTypeId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [status, setStatus] = useState("");
  const [showValidation, setShowValidation] = useState(false);

  const [statusCodes, setStatusCodes] = useState<number[]>([]);
  const [statusesLoading, setStatusesLoading] = useState(false);
  const [statusesError, setStatusesError] = useState("");

  const [applied, setApplied] = useState<AppliedQuery | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [listRevision, setListRevision] = useState(0);

  const [result, setResult] = useState<PagedResult<EmailAlertItem> | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");

  const [selectedMap, setSelectedMap] = useState<Record<number, EmailAlertItem>>({});
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setTypesLoading(true);
    setTypesError("");
    evaluationLookupApi
      .getTypes(controller.signal)
      .then((rows) => { if (!controller.signal.aborted) setTypes(rows); })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setTypesError(requestMessage(cause, "Không tải được danh sách loại đánh giá."));
      })
      .finally(() => { if (!controller.signal.aborted) setTypesLoading(false); });
    return () => controller.abort();
  }, [typesRevision]);

  const selectedType = types.find((item) => String(item.id) === typeId);
  const periods = selectedType?.listKPIEvaluationPeriodDto ?? [];
  const selectedPeriod = periods.find((item) => String(item.id) === periodId);

  useEffect(() => {
    setStatus("");
    setStatusesError("");
    const templateIds = (selectedPeriod?.templatePeriodDtos ?? [])
      .filter((item) => item.isActive)
      .map((item) => item.templateId);
    if (!periodId || !templateIds.length) {
      setStatusCodes([]);
      setStatusesLoading(false);
      return;
    }

    const controller = new AbortController();
    setStatusesLoading(true);
    emailAlertApi
      .getActiveStatuses(templateIds, controller.signal)
      .then((codes) => { if (!controller.signal.aborted) setStatusCodes(codes); })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setStatusCodes([]);
          setStatusesError(requestMessage(cause, "Không tải được danh sách trạng thái."));
        }
      })
      .finally(() => { if (!controller.signal.aborted) setStatusesLoading(false); });
    return () => controller.abort();
  }, [periodId, selectedPeriod]);

  useEffect(() => {
    if (!applied) return;
    const controller = new AbortController();
    setListLoading(true);
    setListError("");
    emailAlertApi
      .getList(
        {
          EvaluationTypeId: applied.evaluationTypeId,
          PeriodId: applied.periodId,
          Statuses: [applied.status],
          PageNumber: page,
          PageSize: pageSize,
        },
        controller.signal
      )
      .then((data) => { if (!controller.signal.aborted) setResult(data); })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setResult(null);
          setListError(requestMessage(cause, "Không tải được danh sách bản đánh giá."));
        }
      })
      .finally(() => { if (!controller.signal.aborted) setListLoading(false); });
    return () => controller.abort();
  }, [applied, page, pageSize, listRevision]);

  const items = result?.items ?? [];
  const selectedItems = Object.values(selectedMap);
  const selectedCount = selectedItems.length;
  const allPageSelected = items.length > 0 && items.every((row) => Boolean(selectedMap[row.id]));
  const somePageSelected = items.some((row) => Boolean(selectedMap[row.id])) && !allPageSelected;
  const sendLabel = sending
    ? "Đang gửi..."
    : selectedCount > 0
      ? `Gửi email (${numberFormat.format(selectedCount)})`
      : "Gửi email";

  function handleTypeChange(nextTypeId: string) {
    setTypeId(nextTypeId);
    setStatus("");
    setShowValidation(false);
    const nextPeriods = types.find((item) => String(item.id) === nextTypeId)?.listKPIEvaluationPeriodDto ?? [];
    setPeriodId(nextPeriods.length === 1 ? String(nextPeriods[0].id) : "");
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!typeId || !periodId || !status) {
      setShowValidation(true);
      return;
    }
    setShowValidation(false);
    setSelectedMap({});
    setPage(1);
    setApplied({ evaluationTypeId: Number(typeId), periodId: Number(periodId), status: Number(status) });
    setListRevision((value) => value + 1);
  }

  function handleReset() {
    setTypeId("");
    setPeriodId("");
    setStatus("");
    setStatusCodes([]);
    setStatusesError("");
    setShowValidation(false);
    setApplied(null);
    setResult(null);
    setListError("");
    setSelectedMap({});
    setPage(1);
    if (typesError) setTypesRevision((value) => value + 1);
  }

  function toggleRow(row: EmailAlertItem) {
    setSelectedMap((current) => {
      if (current[row.id]) {
        const next = { ...current };
        delete next[row.id];
        return next;
      }
      return { ...current, [row.id]: row };
    });
  }

  function toggleAllOnPage() {
    setSelectedMap((current) => {
      const next = { ...current };
      if (allPageSelected) {
        for (const row of items) delete next[row.id];
      } else {
        for (const row of items) next[row.id] = row;
      }
      return next;
    });
  }

  async function handleSendEmails() {
    if (sending || !selectedCount) return;
    setSending(true);
    try {
      const response = await emailAlertApi.send(selectedItems);
      if (response.failedCount === 0) {
        notify("success", `Đã gửi email thông báo thành công cho ${response.successCount}/${response.total} bản đánh giá.`);
        setSelectedMap({});
      } else {
        const failedIds = new Set(response.failedEvaluationIds);
        setSelectedMap((current) =>
          Object.fromEntries(Object.entries(current).filter(([, item]) => failedIds.has(item.id)))
        );
        const detail = response.errors[0] ? ` (${response.errors[0]})` : "";
        notify(
          response.successCount > 0 ? "warning" : "error",
          `Gửi thành công ${response.successCount}/${response.total}, thất bại ${response.failedCount}${detail}.`
        );
      }
    } catch (cause: unknown) {
      notify("error", requestMessage(cause, "Không gửi được email thông báo. Vui lòng thử lại."));
    } finally {
      setSending(false);
    }
  }

  const floatingActions: FloatingSelectionAction[] = [
    ...(!allPageSelected && items.length > 0
      ? [{ key: "select-page", label: "Chọn cả trang", icon: <CheckCircledIcon aria-hidden="true" />, onClick: toggleAllOnPage }]
      : []),
    {
      key: "send",
      label: sendLabel,
      icon: <PaperPlaneIcon aria-hidden="true" />,
      tone: "primary",
      disabled: sending,
      onClick: () => void handleSendEmails(),
    },
  ];

  return (
    <section className="evaluation-common__page send-email-alert__page" aria-labelledby="send-email-alert-title">
      <header className="send-email-alert__hero">
        <div className="send-email-alert__heroCopy">
          <h1 id="send-email-alert-title">Gửi email thông báo<span>.</span></h1>
          <p>Lọc đúng kỳ duyệt. Nhắc đúng người nhận.</p>
          <span className="send-email-alert__heroScope">
            <EnvelopeClosedIcon aria-hidden="true" />
            Quản trị · Gửi email nhắc duyệt theo trạng thái
          </span>
        </div>

        <div className="send-email-alert__glassCard" aria-hidden="true">
          <span className="send-email-alert__glassBadge"><PaperPlaneIcon /></span>
          <div className="send-email-alert__glassLines">
            <span className="is-accent" />
            <span />
            <span className="is-short" />
          </div>
        </div>
      </header>

      <form className="evaluation-common__filters send-email-alert__filters" onSubmit={handleSearch} noValidate>
        <div className="send-email-alert__filterRow">
          <div className="send-email-alert__field">
            <label htmlFor="email-alert-type">
              Tên bản đánh giá <span className="send-email-alert__required" aria-hidden="true">*</span>
            </label>
            <SearchableSelect
              id="email-alert-type"
              label="Tên bản đánh giá"
              options={types.map((item) => ({ id: String(item.id), name: item.name }))}
              value={typeId}
              placeholder={typesLoading ? "Đang tải loại đánh giá..." : "Chọn tên bản đánh giá"}
              disabled={typesLoading || sending}
              loading={typesLoading}
              required
              invalid={showValidation && !typeId}
              onChange={handleTypeChange}
            />
          </div>

          <div className="send-email-alert__field">
            <label htmlFor="email-alert-period">
              Kỳ đánh giá <span className="send-email-alert__required" aria-hidden="true">*</span>
            </label>
            <SearchableSelect
              id="email-alert-period"
              label="Kỳ đánh giá"
              options={periods.map((item) => ({ id: String(item.id), name: item.name }))}
              value={periodId}
              placeholder={typeId ? "Chọn kỳ đánh giá" : "Chọn bản đánh giá trước"}
              disabled={!typeId || sending}
              required
              invalid={showValidation && !periodId}
              emptyMessage="Không có kỳ đánh giá"
              onChange={(value) => { setPeriodId(value); setStatus(""); setShowValidation(false); }}
            />
          </div>

          <div className="send-email-alert__field">
            <label htmlFor="email-alert-status">
              Trạng thái <span className="send-email-alert__required" aria-hidden="true">*</span>
            </label>
            <SearchableSelect
              id="email-alert-status"
              label="Trạng thái"
              options={statusCodes.map((code) => ({ id: String(code), name: hrStatusLabel(code) }))}
              value={status}
              placeholder={
                statusesLoading ? "Đang tải trạng thái..." : periodId ? "Chọn trạng thái" : "Chọn kỳ đánh giá trước"
              }
              disabled={!periodId || statusesLoading || sending}
              loading={statusesLoading}
              required
              invalid={showValidation && !status}
              emptyMessage="Không có trạng thái phù hợp"
              onChange={(value) => { setStatus(value); setShowValidation(false); }}
            />
          </div>

          <div className="send-email-alert__filterButtons">
            <button
              type="button"
              className="evaluation-common__button send-email-alert__clearButton"
              aria-label="Làm mới bộ lọc"
              title="Làm mới bộ lọc"
              disabled={listLoading || sending}
              onClick={handleReset}
            >
              <ResetIcon aria-hidden="true" />
            </button>
            <button
              type="submit"
              className="evaluation-common__button send-email-alert__applyButton"
              disabled={typesLoading || statusesLoading || listLoading || sending}
            >
              <MagnifyingGlassIcon aria-hidden="true" />
              <span>{listLoading ? "Đang tải..." : "Xem danh sách"}</span>
            </button>
          </div>
        </div>

        {(typesError || statusesError || showValidation) && (
          <div className="evaluation-common__error" role="alert">
            <ExclamationTriangleIcon aria-hidden="true" />
            <span>{typesError || statusesError || "Vui lòng chọn đầy đủ Tên bản đánh giá, Kỳ đánh giá và Trạng thái."}</span>
            {typesError && (
              <button type="button" onClick={() => setTypesRevision((value) => value + 1)}>Thử lại</button>
            )}
          </div>
        )}
      </form>

      <div className="evaluation-common__inbox" aria-busy={listLoading}>
        <div className="evaluation-common__listHeading send-email-alert__listHeading">
          <div>
            <FileTextIcon className="send-email-alert__headingGlyph" aria-hidden="true" />
            <h2>Danh sách bản đánh giá</h2>
            {result && <span className="evaluation-common__count">{numberFormat.format(result.total)}</span>}
          </div>

          <div className="send-email-alert__listTools">
            {result && (
              <span className="send-email-alert__selectionCount" role="status" aria-live="polite">
                {selectedCount > 0
                  ? `Đã chọn ${numberFormat.format(selectedCount)} / ${numberFormat.format(result.total)}`
                  : `${numberFormat.format(items.length)} bản đánh giá đang hiển thị`}
              </span>
            )}
            {selectedCount > 0 && (
              <button
                type="button"
                className="send-email-alert__clearLink"
                disabled={sending}
                onClick={() => setSelectedMap({})}
              >
                Bỏ chọn
              </button>
            )}
            <button
              type="button"
              className="evaluation-common__button evaluation-common__primary send-email-alert__sendButton"
              disabled={sending || selectedCount === 0}
              onClick={() => void handleSendEmails()}
            >
              <PaperPlaneIcon aria-hidden="true" />
              <span>{sendLabel}</span>
            </button>
            <button
              type="button"
              className="evaluation-common__refresh"
              aria-label="Tải lại danh sách"
              title="Tải lại danh sách"
              disabled={!applied || listLoading || sending}
              onClick={() => setListRevision((value) => value + 1)}
            >
              <ReloadIcon aria-hidden="true" />
            </button>
          </div>
        </div>

        {!applied ? (
          <div className="evaluation-common__empty">
            <span className="evaluation-common__emptyIcon" aria-hidden="true"><EnvelopeClosedIcon /></span>
            <h3>Chọn điều kiện để xem danh sách</h3>
            <p>Chọn tên bản đánh giá, kỳ đánh giá và trạng thái phía trên rồi bấm Xem danh sách.</p>
          </div>
        ) : listLoading ? (
          <div className="evaluation-common__loading" role="status">
            <span className="evaluation-common__srOnly">Đang tải danh sách bản đánh giá</span>
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="evaluation-common__skeleton" aria-hidden="true">
                <i /><div><i /><i /></div><i />
              </div>
            ))}
          </div>
        ) : listError ? (
          <div className="evaluation-common__empty">
            <span className="evaluation-common__emptyIcon send-email-alert__errorIcon" aria-hidden="true">
              <ExclamationTriangleIcon />
            </span>
            <h3>Không tải được danh sách</h3>
            <p>{listError}</p>
            <button type="button" className="evaluation-common__button" onClick={() => setListRevision((value) => value + 1)}>
              <ReloadIcon aria-hidden="true" />
              Thử lại
            </button>
          </div>
        ) : !items.length ? (
          <div className="evaluation-common__empty">
            <span className="evaluation-common__emptyIcon" aria-hidden="true"><EnvelopeClosedIcon /></span>
            <h3>Chưa có bản đánh giá phù hợp</h3>
            <p>Không tìm thấy bản đánh giá cần gửi email thông báo ở trạng thái đã chọn.</p>
          </div>
        ) : (
          <div className="evaluation-common__tableWrap">
            <table className="evaluation-common__table send-email-alert__table">
              <caption className="evaluation-common__srOnly">Danh sách bản đánh giá gửi email thông báo</caption>
              <thead>
                <tr>
                  <th scope="col" className="send-email-alert__selectionCell">
                    <label className="send-email-alert__checkboxControl">
                      <input
                        ref={(el) => { if (el) el.indeterminate = somePageSelected; }}
                        type="checkbox"
                        checked={allPageSelected}
                        disabled={sending}
                        aria-label="Chọn tất cả bản đánh giá trên trang"
                        onChange={toggleAllOnPage}
                      />
                      <span className="send-email-alert__selectAllLabel">Chọn tất cả trên trang</span>
                    </label>
                  </th>
                  <th scope="col" className="send-email-alert__employeeColumn">
                    <span className="send-email-alert__columnLabel"><PersonIcon aria-hidden="true" />Nhân viên</span>
                  </th>
                  <th scope="col" className="send-email-alert__companyColumn">
                    <span className="send-email-alert__columnLabel"><Component1Icon aria-hidden="true" />Đơn vị</span>
                  </th>
                  <th scope="col" className="send-email-alert__positionColumn">
                    <span className="send-email-alert__columnLabel"><IdCardIcon aria-hidden="true" />Chức vụ</span>
                  </th>
                  <th scope="col" className="send-email-alert__periodColumn">
                    <span className="send-email-alert__columnLabel"><CalendarIcon aria-hidden="true" />Kỳ đánh giá</span>
                  </th>
                  <th scope="col" className="send-email-alert__recipientsColumn">
                    <span className="send-email-alert__columnLabel"><EnvelopeClosedIcon aria-hidden="true" />Người nhận email</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const checked = Boolean(selectedMap[row.id]);
                  const employeeName = row.userFullName || "—";
                  const logo = companyLogos[row.companyCode ?? ""] ?? "/brand/deoca-icon.svg";
                  return (
                    <tr key={row.id} data-selected={checked}>
                      <td className="send-email-alert__selectionCell">
                        <label className="send-email-alert__checkboxControl">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={sending}
                            aria-label={`Chọn bản đánh giá của ${employeeName}`}
                            onChange={() => toggleRow(row)}
                          />
                        </label>
                      </td>
                      <td data-label="Nhân viên" className="send-email-alert__employeeCell">
                        <div className="evaluation-common__employee">
                          <span className="evaluation-common__avatar" aria-hidden="true"><PersonIcon aria-hidden="true" /></span>
                          <div>
                            <strong>{employeeName}</strong>
                            <span>{row.systemCode || "—"}</span>
                          </div>
                        </div>
                      </td>
                      <td data-label="Đơn vị" className="send-email-alert__organizationCell">
                        <span className="send-email-alert__companyIdentity">
                          <Image className="send-email-alert__companyLogo" src={logo} alt="" width={32} height={32} />
                          <span className="send-email-alert__company">{row.companyCode || "—"}</span>
                        </span>
                        <span className="send-email-alert__department">{row.departmentName || "—"}</span>
                      </td>
                      <td data-label="Chức vụ" className="send-email-alert__positionCell">
                        {row.jobPositionName || "—"}
                      </td>
                      <td data-label="Kỳ đánh giá" className="send-email-alert__periodCell">
                        <div className="send-email-alert__periodIdentity">
                          <span className="send-email-alert__periodIcon" aria-hidden="true"><CalendarIcon /></span>
                          <span className="send-email-alert__period">{row.period || "—"}</span>
                        </div>
                      </td>
                      <td data-label="Người nhận email" className="send-email-alert__recipientsCell">
                        {row.emailRecipients.length > 0 ? (
                          <ul className="send-email-alert__recipients">
                            {row.emailRecipients.map((recipient) => {
                              const displayName = recipient.userName || recipient.userIdStr;
                              const tooltip = [
                                displayName,
                                recipient.systemCode && `(${recipient.systemCode})`,
                                recipient.status && `· ${hrStatusLabel(recipient.status)}`,
                              ].filter(Boolean).join(" ");
                              return (
                                <li key={recipient.id} className="send-email-alert__recipientChip" title={tooltip}>
                                  {displayName}
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <span className="send-email-alert__muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {applied && (
          <Pagination
            itemLabel="bản đánh giá"
            page={page}
            pageSize={pageSize}
            total={result?.total ?? null}
            loading={listLoading}
            error={Boolean(listError)}
            disabled={sending}
            pageSizeOptions={[10, 20, 50]}
            onPageChange={setPage}
            onPageSizeChange={(nextSize) => { setPageSize(nextSize); setPage(1); }}
          />
        )}
      </div>

      <FloatingSelectionBar
        count={selectedCount}
        label="bản đánh giá đã chọn"
        actions={floatingActions}
        disabled={sending}
        onClear={() => setSelectedMap({})}
      />
    </section>
  );
}
