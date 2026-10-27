import Image from "next/image";
import styles from "./loading.module.css";

export default function Loading() {
  return (
    <div className={styles.loading} role="status" aria-label="Đang tải trang">
      <Image src="/brand/deoca-icon.png" alt="" width={64} height={64} className={styles.logo} unoptimized />
    </div>
  );
}
