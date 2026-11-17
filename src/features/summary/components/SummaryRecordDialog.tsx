"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { ActivityLogIcon, Cross2Icon, FileTextIcon, PersonIcon } from "@radix-ui/react-icons";
import { companyLogos } from "@/features/company/companyLogos";
import { formatEvaluationDate } from "@/features/evaluation/evaluationDisplay";
import type { SummaryDetail } from "../types";

type Props = { row: SummaryDetail; onClose: () => void; onHistory: () => void };

function bandTone(band: string) {
  const key = band.trim().toUpperCase();
  if (key.startsWith("A")) return "success";
  if (key.startsWith("B")) return "info";
  if (key.startsWith("C")) return "warning";
  if (key.startsWith("D")) return "danger";
  return "neutral";
}

export function SummaryRecordDialog({ row, onClose, onHistory }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const rejected = row.isReject || row.status === "Rejected";
  const complete = row.status === "Over" || row.status === "CompileHRList";
  const waiting = /Reviewing$/.test(row.status);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { element?.close(); document.body.style.overflow = overflow; };
  }, []);

  return (
    <dialog ref={dialog} className="summary-detail__dialog summary-detail__recordDialog" aria-labelledby="summary-record-title"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <header className="summary-detail__dialogHeader">
        <span className="summary-detail__dialogIcon"><FileTextIcon aria-hidden="true" /></span>
        <div><h2 id="summary-record-title">Chi tiết hồ sơ tổng hợp</h2><p>{row.templateCode}</p></div>
        <button type="button" className="summary-detail__iconButton" aria-label="Đóng chi tiết hồ sơ" onClick={onClose}><Cross2Icon aria-hidden="true" /></button>
      </header>
      <div className="summary-detail__dialogBody">
        <div className="summary-detail__recordIdentity">
          <span className="summary-detail__avatar"><PersonIcon aria-hidden="true" /></span>
          <div><h3>{row.userName}</h3><p>{row.userId} · {row.jobName || "Chưa có chức danh"}</p></div>
          <span className="summary-detail__status" data-tone={rejected ? "danger" : complete ? "success" : waiting ? "waiting" : "progress"}>{row.statusDisplay}</span>
        </div>
        <dl className="summary-detail__recordScores">
          <div><dt>Điểm tự đánh giá</dt><dd>{row.score?.toLocaleString("vi-VN") ?? "—"}</dd></div>
          <div><dt>Điểm quản lý</dt><dd>{row.managerSocre?.toLocaleString("vi-VN") ?? "—"}</dd></div>
          <div><dt>Hệ số HTCV</dt><dd>{row.rPercent?.toLocaleString("vi-VN") ?? "—"}</dd></div>
          <div><dt>Tỷ lệ chi</dt><dd>{row.band ? <span className="summary-detail__bandBadge" data-tone={bandTone(row.band)}>{row.band}</span> : "—"}</dd></div>
        </dl>
        <dl className="summary-detail__recordFacts">
          <div><dt>Kỳ đánh giá</dt><dd>{row.periodName}</dd></div>
          <div><dt>Công ty</dt><dd className="summary-detail__recordCompany"><span className="summary-detail__company"><Image src={companyLogos[row.companyCode] ?? "/brand/deoca-icon.svg"} alt="" width={20} height={20} />{row.companyCode}</span><span>{row.companyName}</span></dd></div>
          <div><dt>Phòng ban</dt><dd>{row.departmentName || "—"}</dd></div>
          <div><dt>Thời gian đánh giá</dt><dd>{formatEvaluationDate(row.startDate)} — {formatEvaluationDate(row.endDate)}</dd></div>
          <div><dt>Người đang xử lý</dt><dd>{row.userDoing || "Chưa có thông tin người xử lý"}</dd></div>
          <div><dt>Ý kiến Ban điều hành</dt><dd className="summary-detail__recordNote">{row.note || "Chưa có ý kiến."}</dd></div>
        </dl>
      </div>
      <footer className="summary-detail__dialogFooter">
        <button type="button" className="summary-detail__button" onClick={onHistory}><ActivityLogIcon aria-hidden="true" />Quá trình phê duyệt</button>
        <button type="button" className="summary-detail__button summary-detail__primary" onClick={onClose}>Đóng</button>
      </footer>
    </dialog>
  );
}
