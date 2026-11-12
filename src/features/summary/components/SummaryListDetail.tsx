import Link from "next/link";
import { ArrowLeftIcon, FileTextIcon } from "@radix-ui/react-icons";
import type { SummaryMode } from "../types";
import "./SummaryList.css";

export function SummaryListDetail({ mode }: { mode: SummaryMode }) {
  return (
    <div className="hr-summary__page">
      <header className="hr-summary__heading">
        <h1>Chi tiết tổng hợp</h1>
        <Link className="hr-summary__button" href={`/summary/summary-list/${mode}`}>
          <ArrowLeftIcon aria-hidden="true" />Về danh sách tổng hợp
        </Link>
      </header>
      <section className="hr-summary__results hr-summary__state" aria-label="Chi tiết tổng hợp">
        <FileTextIcon aria-hidden="true" />
        <p>Phần chi tiết sẽ được bổ sung ở bước tiếp theo.</p>
      </section>
    </div>
  );
}
