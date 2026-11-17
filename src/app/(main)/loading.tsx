import Image from "next/image";
import "./loading.css";

export default function Loading() {
  return (
    <div className="main-loading__loading" role="status" aria-label="Đang tải trang">
      <Image src="/brand/deoca-icon.svg" alt="" width={64} height={64} className="main-loading__logo" unoptimized />
    </div>
  );
}
