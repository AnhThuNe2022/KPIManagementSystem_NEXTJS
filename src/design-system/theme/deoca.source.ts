import { defineTheme, type TokenValue } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";

/**
 * =============================================================================
 * NGUỒN GỐC DUY NHẤT (SINGLE SOURCE OF TRUTH) CHO TOÀN BỘ GIAO DIỆN ĐÈO CẢ
 * =============================================================================
 * - Chứa toàn bộ màu sắc, font chữ, cỡ chữ, bo góc, tốc độ hiệu ứng (Sáng & Tối).
 * - QUY TẮC BẮT BUỘC: KHÔNG sửa tay các file sinh tự động (deoca.css / deoca.js / deoca.d.ts).
 *   Mỗi khi sửa file này, chạy lại: `npm run theme:build`
 * - Quy ước mảng 2 màu: ["Màu_Chế_Độ_Sáng", "Màu_Chế_Độ_Tối"].
 * - Tuyệt đối không dùng CSS đổi màu logo gốc (deoca-group.svg, deoca-icon.svg, bgls.svg, tlmt.svg).
 */
export const DEOCA_PALETTE = {
  // Màu đỏ thương hiệu chính + 4 mức sắc độ nhạt (80%, 60%, 40%, 20%) và đỏ đậm
  red: {
    base: "#ED1C24", // Pantone 485 C
    tint80: "#F14950",
    tint60: "#F4777C",
    tint40: "#F8A4A7",
    tint20: "#FBD2D3",
    dark: "#BE1E2D",
  },
  blue: {
    base: "#2E3192", // Pantone 7687 C
    tint80: "#585AA8",
    tint60: "#8283BE",
    tint40: "#ABACD3",
    tint20: "#D5D6E9",
    navy: "#262262",
    sky: "#3D71B8",
    skyLight: "#AEC5E7",
  },
  warm: {
    orange: "#F58233",
    gold: "#FDBA4D",
    cream: "#FFFDE9",
  },
  neutral: {
    charcoal: "#363639",
    plumDark: "#5A515A",
    plumMuted: "#8E8189",
    beigeLight: "#CCC2C0",
    coolLight: "#CAD5DA",
  },
} as const;

const deocaLocalTokens: Record<string, TokenValue> = {
  // Biến màu thương hiệu nội bộ (--deoca-*) dùng trong globals.css
  "--deoca-red": DEOCA_PALETTE.red.base,
  "--deoca-red-80": DEOCA_PALETTE.red.tint80,
  "--deoca-red-60": DEOCA_PALETTE.red.tint60,
  "--deoca-red-40": DEOCA_PALETTE.red.tint40,
  "--deoca-red-20": DEOCA_PALETTE.red.tint20,
  "--deoca-red-dark": DEOCA_PALETTE.red.dark,

  "--deoca-blue": DEOCA_PALETTE.blue.base,
  "--deoca-blue-80": DEOCA_PALETTE.blue.tint80,
  "--deoca-blue-60": DEOCA_PALETTE.blue.tint60,
  "--deoca-blue-40": DEOCA_PALETTE.blue.tint40,
  "--deoca-blue-20": DEOCA_PALETTE.blue.tint20,
  "--deoca-navy": DEOCA_PALETTE.blue.navy,
  "--deoca-sky": DEOCA_PALETTE.blue.sky,
  "--deoca-sky-light": DEOCA_PALETTE.blue.skyLight,

  "--deoca-orange": DEOCA_PALETTE.warm.orange,
  "--deoca-gold": DEOCA_PALETTE.warm.gold,
  "--deoca-cream": [DEOCA_PALETTE.warm.cream, "#29251C"],

  "--deoca-charcoal": DEOCA_PALETTE.neutral.charcoal,
  "--deoca-plum-dark": DEOCA_PALETTE.neutral.plumDark,
  "--deoca-plum-muted": DEOCA_PALETTE.neutral.plumMuted,
  "--deoca-beige": DEOCA_PALETTE.neutral.beigeLight,
  "--deoca-cool-gray": DEOCA_PALETTE.neutral.coolLight,

  // Khung ứng dụng Executive Shell (Thanh Header vát chéo, Sidebar rãnh lõm & Thanh Dock đáy kính mờ)
  "--shell-header-height": "76px",
  "--shell-paper": ["#FFFFFF", "#15192B"],
  "--shell-well": ["#EAEFF7", "#0D1020"],
  "--shell-wedge-start": [DEOCA_PALETTE.blue.navy, "#1A1E54"],
  "--shell-wedge-mid": [DEOCA_PALETTE.blue.base, "#25297A"],
  "--shell-wedge-end": [DEOCA_PALETTE.blue.sky, "#2F4F92"],
  "--shell-stripe-red": [DEOCA_PALETTE.red.base, DEOCA_PALETTE.red.tint80],
  "--shell-stripe-red-bright": [DEOCA_PALETTE.red.tint80, DEOCA_PALETTE.red.tint60],
  "--shell-brand-subtitle": [DEOCA_PALETTE.blue.skyLight, DEOCA_PALETTE.blue.skyLight],
  "--shell-on-wedge": ["#FFFFFF", "#FFFFFF"],
  "--shell-logo-bg": ["#FFFFFF", "#FFFFFF"],
  "--shell-sidebar-bg": ["#FFFFFF", "#15192B"],
  "--shell-sidebar-ink": [DEOCA_PALETTE.neutral.plumDark, "#B9C6E0"],
  "--shell-sidebar-strong": [DEOCA_PALETTE.blue.navy, "#F1F5FF"],
  "--shell-sidebar-muted": [DEOCA_PALETTE.neutral.plumMuted, "#8B9AB8"],
  "--shell-sidebar-line": ["#E4EAF5", "#272F4B"],
  "--shell-sidebar-edge": ["rgba(46, 49, 146, 0.14)", "rgba(174, 197, 231, 0.14)"],
  "--shell-shadow-strong": ["rgba(38, 34, 98, 0.22)", "rgba(0, 0, 0, 0.58)"],
  "--shell-shadow-soft": ["rgba(38, 34, 98, 0.08)", "rgba(0, 0, 0, 0.30)"],
  "--shell-bevel-light": ["rgba(255, 255, 255, 0.85)", "rgba(174, 197, 231, 0.08)"],
  "--shell-bevel-shadow": ["rgba(38, 34, 98, 0.16)", "rgba(0, 0, 0, 0.45)"],
  "--shell-hover-wash": ["rgba(46, 49, 146, 0.08)", "rgba(174, 197, 231, 0.10)"],
  "--shell-active-wash": ["rgba(46, 49, 146, 0.13)", "rgba(174, 197, 231, 0.16)"],
  "--shell-dock-border": ["rgba(255, 255, 255, 0.80)", "rgba(174, 197, 231, 0.18)"],
  "--shell-dock-surface": ["rgba(255, 255, 255, 0.72)", "rgba(21, 25, 43, 0.74)"],
  "--shell-dock-tint": ["rgba(235, 241, 255, 0.56)", "rgba(14, 17, 32, 0.68)"],
  "--shell-spark-red": [DEOCA_PALETTE.red.base, DEOCA_PALETTE.red.tint60],
  "--shell-spark-blue": [DEOCA_PALETTE.blue.base, DEOCA_PALETTE.blue.skyLight],

  // Màu bảng dữ liệu, dòng đã tick chọn, thẻ kỳ đánh giá, đồng hồ, ô nhân sự, điểm số & pill công ty
  "--vibrant-table-head-start": ["#F7F9FE", "#1A2036"],
  "--vibrant-table-head-end": ["#EEF2FB", "#151A2C"],
  "--vibrant-row-selected-bg": ["rgba(46, 49, 146, 0.065)", "rgba(122, 134, 236, 0.14)"],
  "--vibrant-period-bg": ["rgba(124, 58, 237, 0.10)", "rgba(167, 139, 250, 0.18)"],
  "--vibrant-period-border": ["rgba(124, 58, 237, 0.22)", "rgba(167, 139, 250, 0.30)"],
  "--vibrant-period-ink": ["#6D28D9", "#C4B5FD"],
  "--vibrant-clock-ink": ["#D97706", "#FBBF24"],
  "--vibrant-identity-bg": ["rgba(46, 49, 146, 0.09)", "rgba(122, 134, 236, 0.18)"],
  "--vibrant-identity-border": ["rgba(46, 49, 146, 0.18)", "rgba(174, 197, 231, 0.24)"],
  "--vibrant-identity-ink": ["#2E3192", "#AEC5E7"],
  "--vibrant-score-ink": ["#1E2464", "#F4F7FF"],
  "--vibrant-company-pill-bg": ["#F4F6FC", "#1F2640"],
  "--vibrant-company-pill-border": ["#D4DCEB", "#364063"],

  // 8 tông màu Thẻ trạng thái Ribbon vát mũi tên (-bg: nền, -border: viền, -ink: chữ, -dot: chấm tròn)
  "--ribbon-blue-bg": ["#EAF0FF", "rgba(59, 130, 246, 0.20)"],
  "--ribbon-blue-border": ["#B9CEFF", "rgba(96, 165, 250, 0.42)"],
  "--ribbon-blue-ink": ["#1D4ED8", "#93C5FD"],
  "--ribbon-blue-dot": ["#2563EB", "#60A5FA"],

  "--ribbon-green-bg": ["#E5F8EF", "rgba(16, 185, 129, 0.20)"],
  "--ribbon-green-border": ["#A7E9C8", "rgba(52, 211, 153, 0.42)"],
  "--ribbon-green-ink": ["#047857", "#6EE7B7"],
  "--ribbon-green-dot": ["#10B981", "#34D399"],

  "--ribbon-orange-bg": ["#FFF2E2", "rgba(245, 130, 51, 0.22)"],
  "--ribbon-orange-border": ["#FCD2A2", "rgba(251, 146, 60, 0.44)"],
  "--ribbon-orange-ink": ["#B45309", "#FDBA74"],
  "--ribbon-orange-dot": ["#F58233", "#FB923C"],

  "--ribbon-purple-bg": ["#F3EBFF", "rgba(139, 92, 246, 0.22)"],
  "--ribbon-purple-border": ["#D8BFFC", "rgba(167, 139, 250, 0.44)"],
  "--ribbon-purple-ink": ["#6D28D9", "#C4B5FD"],
  "--ribbon-purple-dot": ["#7C3AED", "#A78BFA"],

  "--ribbon-red-bg": ["#FEEBEC", "rgba(237, 28, 36, 0.22)"],
  "--ribbon-red-border": ["#FBBEC2", "rgba(248, 113, 113, 0.44)"],
  "--ribbon-red-ink": ["#BE123C", "#FCA5A5"],
  "--ribbon-red-dot": ["#ED1C24", "#F87171"],

  "--ribbon-teal-bg": ["#E6FAF7", "rgba(20, 184, 166, 0.20)"],
  "--ribbon-teal-border": ["#A7EAE0", "rgba(45, 212, 191, 0.42)"],
  "--ribbon-teal-ink": ["#0F766E", "#5EEAD4"],
  "--ribbon-teal-dot": ["#0D9488", "#2DD4BF"],

  "--ribbon-cyan-bg": ["#E6F7FE", "rgba(14, 165, 233, 0.20)"],
  "--ribbon-cyan-border": ["#A8E1FA", "rgba(56, 189, 248, 0.42)"],
  "--ribbon-cyan-ink": ["#0369A1", "#7DD3FC"],
  "--ribbon-cyan-dot": ["#0284C7", "#38BDF8"],

  "--ribbon-neutral-bg": ["#F1F4F9", "rgba(148, 163, 184, 0.18)"],
  "--ribbon-neutral-border": ["#D5DCE8", "rgba(148, 163, 184, 0.34)"],
  "--ribbon-neutral-ink": ["#475569", "#CBD5E1"],
  "--ribbon-neutral-dot": ["#64748B", "#94A3B8"],

  // 6 tông màu Banner 3D đầu trang <PageHeader> (Tổng quan, Đánh giá, Tổng hợp, Tổ chức, Quản trị, Cá nhân)
  "--art-dashboard-start": ["#262262", "#3B44B8"],
  "--art-dashboard-end": ["#3D71B8", "#2563EB"],
  "--art-dashboard-accent": ["#ED1C24", "#F4777C"],
  "--art-dashboard-glow": ["rgba(46, 49, 146, 0.26)", "rgba(96, 165, 250, 0.34)"],

  "--art-evaluation-start": ["#2E3192", "#4F46E5"],
  "--art-evaluation-end": ["#3B82F6", "#60A5FA"],
  "--art-evaluation-accent": ["#6366F1", "#A5B4FC"],
  "--art-evaluation-glow": ["rgba(59, 130, 246, 0.28)", "rgba(99, 102, 241, 0.36)"],

  "--art-summary-start": ["#047857", "#059669"],
  "--art-summary-end": ["#0EA5E9", "#14B8A6"],
  "--art-summary-accent": ["#10B981", "#34D399"],
  "--art-summary-glow": ["rgba(16, 185, 129, 0.26)", "rgba(20, 184, 166, 0.36)"],

  "--art-organization-start": ["#EA580C", "#F58233"],
  "--art-organization-end": ["#F59E0B", "#FBBF24"],
  "--art-organization-accent": ["#F58233", "#FDBA4D"],
  "--art-organization-glow": ["rgba(245, 130, 51, 0.28)", "rgba(251, 191, 36, 0.34)"],

  "--art-admin-start": ["#5B21B6", "#7C3AED"],
  "--art-admin-end": ["#4F46E5", "#6366F1"],
  "--art-admin-accent": ["#7C3AED", "#A78BFA"],
  "--art-admin-glow": ["rgba(124, 58, 237, 0.28)", "rgba(139, 92, 246, 0.36)"],

  "--art-personal-start": ["#0284C7", "#0EA5E9"],
  "--art-personal-end": ["#38BDF8", "#6366F1"],
  "--art-personal-accent": ["#0EA5E9", "#7DD3FC"],
  "--art-personal-glow": ["rgba(14, 165, 233, 0.26)", "rgba(56, 189, 248, 0.34)"],

  // 5 tông màu Gradient cho Thẻ chỉ số KPI (<MetricStrip> / .ds-metric-card)
  "--metric-blue-start": ["#2E3192", "#4338CA"],
  "--metric-blue-end": ["#3B82F6", "#38BDF8"],
  "--metric-blue-glow": ["rgba(46, 49, 146, 0.28)", "rgba(59, 130, 246, 0.36)"],

  "--metric-green-start": ["#059669", "#10B981"],
  "--metric-green-end": ["#14B8A6", "#34D399"],
  "--metric-green-glow": ["rgba(16, 185, 129, 0.28)", "rgba(52, 211, 153, 0.36)"],

  "--metric-orange-start": ["#EA580C", "#F58233"],
  "--metric-orange-end": ["#F59E0B", "#FBBF24"],
  "--metric-orange-glow": ["rgba(245, 130, 51, 0.28)", "rgba(251, 191, 36, 0.36)"],

  "--metric-red-start": ["#BE1E2D", "#DC2626"],
  "--metric-red-end": ["#ED1C24", "#FB7185"],
  "--metric-red-glow": ["rgba(237, 28, 36, 0.28)", "rgba(248, 113, 113, 0.36)"],

  "--metric-neutral-start": ["#475569", "#64748B"],
  "--metric-neutral-end": ["#64748B", "#94A3B8"],
  "--metric-neutral-glow": ["rgba(71, 85, 105, 0.22)", "rgba(148, 163, 184, 0.28)"],

  // 6 cặp màu Gradient tự động cho Avatar chữ cái nhân viên (băm cố định theo tên)
  "--avatar-0-start": ["#262262", "#3B44B8"],
  "--avatar-0-end": ["#3D71B8", "#60A5FA"],
  "--avatar-1-start": ["#0F766E", "#0D9488"],
  "--avatar-1-end": ["#10B981", "#34D399"],
  "--avatar-2-start": ["#6D28D9", "#7C3AED"],
  "--avatar-2-end": ["#8B5CF6", "#A78BFA"],
  "--avatar-3-start": ["#C2410C", "#EA580C"],
  "--avatar-3-end": ["#F58233", "#FBBF24"],
  "--avatar-4-start": ["#0369A1", "#0284C7"],
  "--avatar-4-end": ["#0EA5E9", "#38BDF8"],
  "--avatar-5-start": ["#BE123C", "#E11D48"],
  "--avatar-5-end": ["#F43F5E", "#FB7185"],

  // Nền khí quyển, thẻ kính mờ, quả cầu 3D & tiêu đề trang Đăng nhập / Đặt lại mật khẩu
  "--auth-canvas-start": ["#F3F6FC", "#0B1220"],
  "--auth-canvas-mid": ["#E7EDF9", "#14223A"],
  "--auth-canvas-end": ["#F9F1F3", "#241821"],
  "--auth-glass-bg": ["rgba(255, 255, 255, 0.72)", "rgba(30, 45, 72, 0.78)"],
  "--auth-glass-tint": ["rgba(245, 248, 255, 0.50)", "rgba(18, 29, 46, 0.68)"],
  "--auth-glass-edge": ["rgba(255, 255, 255, 0.86)", "rgba(198, 218, 249, 0.22)"],
  "--auth-caption-bg": ["rgba(255, 255, 255, 0.90)", "rgba(21, 25, 43, 0.88)"],
  "--auth-orb-core": ["#E0E8FF", "#4E68A6"],
  "--auth-orb-mid": ["#9AAFD6", "#2E457A"],
  "--auth-orb-edge": ["#6077A8", "#18274A"],
  "--auth-ring-color": ["#C1CFEB", "#4B6294"],
  "--auth-headline-start": [DEOCA_PALETTE.blue.base, "#93B4FF"],
  "--auth-headline-mid": ["#3B63D9", "#60A5FA"],
  "--auth-headline-end": [DEOCA_PALETTE.blue.navy, "#E2ECFF"],
};

export const deocaTheme = defineTheme({
  name: "deoca",
  extends: neutralTheme,
  localTokens: deocaLocalTokens,

  // Cấu hình font chữ toàn hệ thống (nạp font Manrope cục bộ từ public/fonts/manrope.ttf)
  typography: {
    scale: { base: 14, ratio: 1.2 },
    body: {
      family: "Manrope",
      fallbacks: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    },
    heading: {
      family: "Manrope",
      fallbacks: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      weights: { 3: "bold", 4: "bold" },
    },
    code: {
      family: "ui-monospace",
      fallbacks: '"SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    },
  },

  // Tốc độ hiệu ứng chuyển động chuẩn (đơn vị ms)
  motion: {
    tempo: 0.9,
    character: "crisp",
    fast: 135,
    medium: 260,
    slow: 600,
    ratio: 0.75,
  },

  tokens: {
    // Thang cỡ chữ chuẩn toàn ứng dụng — muốn tăng/giảm cỡ chữ toàn web, chỉ cần chỉnh 5 dòng này
    "--font-size-xs": "0.71875rem",   // 11.5px (nhãn phụ, badge nhỏ)
    "--font-size-sm": "0.8125rem",    // 13px   (chữ bảng, mô tả, tab lọc)
    "--font-size-base": "0.875rem",   // 14px   (nội dung chính, ô nhập liệu, nút bấm)
    "--font-size-xl": "1.3125rem",    // 21px   (tiêu đề H2)
    "--font-size-2xl": "1.5625rem",   // 25px   (tiêu đề H1 đầu trang)

    // Màu nền trang & các bề mặt thẻ (Sáng / Tối)
    "--color-background-body": ["#F2F4F9", "#0E111D"],
    "--color-background-surface": ["#FFFFFF", "#15192B"],
    "--color-background-card": ["#FFFFFF", "#15192B"],
    "--color-background-popover": ["#FFFFFF", "#1D2238"],
    "--color-background-muted": ["#ECF0F7", "#20253D"],

    // Màu nhấn chủ đạo thương hiệu Đèo Cả (Xanh #2E3192 bản Sáng / Xanh sáng #7A86EC bản Tối)
    "--color-accent": [DEOCA_PALETTE.blue.base, "#7A86EC"],
    "--color-accent-muted": [DEOCA_PALETTE.blue.tint20, "#2E31924D"],
    "--color-on-accent": ["#FFFFFF", "#0F1020"],
    "--color-text-accent": [DEOCA_PALETTE.blue.base, "#AEC5E7"],
    "--color-icon-accent": [DEOCA_PALETTE.blue.base, "#AEC5E7"],

    // Phân cấp màu chữ & icon (Chính / Phụ / Vô hiệu hóa)
    "--color-text-primary": [DEOCA_PALETTE.neutral.charcoal, "#F1F3F8"],
    "--color-text-secondary": [DEOCA_PALETTE.neutral.plumDark, DEOCA_PALETTE.neutral.coolLight],
    "--color-text-disabled": [DEOCA_PALETTE.neutral.plumMuted, "#7A727A"],
    "--color-icon-primary": [DEOCA_PALETTE.neutral.charcoal, "#F1F3F8"],
    "--color-icon-secondary": [DEOCA_PALETTE.neutral.plumDark, DEOCA_PALETTE.neutral.coolLight],
    "--color-icon-disabled": [DEOCA_PALETTE.neutral.plumMuted, "#7A727A"],

    // Viền khung, đường phân cách & viền ô nhập liệu (tông xanh-xám lạnh đồng bộ nền Đèo Cả)
    "--color-border": ["#D3DDEA", "#2B324C"],
    "--color-border-emphasized": ["#B9C6DF", "#3E4768"],

    // Màu trạng thái ngữ nghĩa (Thông tin / Lỗi / Cảnh báo — đồng bộ Đỏ, Cam, Xanh Đèo Cả)
    "--color-info": [DEOCA_PALETTE.blue.sky, DEOCA_PALETTE.blue.skyLight],
    "--color-info-muted": ["#AEC5E755", "#3D71B83D"],
    "--color-on-info": ["#FFFFFF", "#121524"],
    "--color-text-info": [DEOCA_PALETTE.blue.sky, DEOCA_PALETTE.blue.skyLight],
    "--color-on-info-muted": [DEOCA_PALETTE.blue.navy, DEOCA_PALETTE.blue.skyLight],

    "--color-error": [DEOCA_PALETTE.red.dark, DEOCA_PALETTE.red.tint80],
    "--color-error-muted": [DEOCA_PALETTE.red.tint20, "#ED1C2438"],
    "--color-on-error": ["#FFFFFF", "#190B0C"],
    "--color-text-error": [DEOCA_PALETTE.red.dark, DEOCA_PALETTE.red.tint40],
    "--color-on-error-muted": [DEOCA_PALETTE.red.dark, DEOCA_PALETTE.red.tint40],

    "--color-warning": [DEOCA_PALETTE.warm.orange, DEOCA_PALETTE.warm.gold],
    "--color-warning-muted": ["#FDBA4D40", "#F5823338"],
    "--color-on-warning": [DEOCA_PALETTE.neutral.charcoal, DEOCA_PALETTE.neutral.charcoal],
    "--color-text-warning": ["#A84E0B", DEOCA_PALETTE.warm.gold],
    "--color-on-warning-muted": ["#7C3806", DEOCA_PALETTE.warm.gold],

    // 7 bảng màu phụ cho Huy hiệu (Badge) & ô icon — ánh xạ sang class Tailwind: bg-{màu}-subtle, border-{màu}-ring, text-{màu}-vivid
    "--color-background-red": ["#FEEBEC", "#4B161B"],
    "--color-border-red": ["#FBBEC2", DEOCA_PALETTE.red.tint80],
    "--color-icon-red": [DEOCA_PALETTE.red.dark, DEOCA_PALETTE.red.tint60],
    "--color-text-red": ["#BE123C", "#FCA5A5"],

    "--color-background-blue": ["#EAF0FF", "#1E2859"],
    "--color-border-blue": ["#B9CEFF", DEOCA_PALETTE.blue.sky],
    "--color-icon-blue": [DEOCA_PALETTE.blue.base, DEOCA_PALETTE.blue.skyLight],
    "--color-text-blue": ["#1D4ED8", "#93C5FD"],

    "--color-background-green": ["#E5F8EF", "#113B2E"],
    "--color-border-green": ["#A7E9C8", "#34D399"],
    "--color-icon-green": ["#059669", "#34D399"],
    "--color-text-green": ["#047857", "#6EE7B7"],

    "--color-background-purple": ["#F3EBFF", "#2D1E55"],
    "--color-border-purple": ["#D8BFFC", "#A78BFA"],
    "--color-icon-purple": ["#7C3AED", "#A78BFA"],
    "--color-text-purple": ["#6D28D9", "#C4B5FD"],

    "--color-background-teal": ["#E6FAF7", "#113A38"],
    "--color-border-teal": ["#A7EAE0", "#2DD4BF"],
    "--color-icon-teal": ["#0D9488", "#2DD4BF"],
    "--color-text-teal": ["#0F766E", "#5EEAD4"],

    "--color-background-cyan": ["#E6F7FE", "#12344D"],
    "--color-border-cyan": ["#A8E1FA", "#38BDF8"],
    "--color-icon-cyan": ["#0284C7", "#38BDF8"],
    "--color-text-cyan": ["#0369A1", "#7DD3FC"],

    "--color-background-orange": ["#FFF2E2", "#4A2A10"],
    "--color-border-orange": ["#FCD2A2", DEOCA_PALETTE.warm.orange],
    "--color-icon-orange": ["#C2410C", DEOCA_PALETTE.warm.gold],
    "--color-text-orange": ["#B45309", "#FDBA74"],

    // Thang độ bo góc chuẩn toàn ứng dụng (--radius-*)
    "--radius-none": "0px",
    "--radius-inner": "0.375rem",
    "--radius-element": "0.5rem",
    "--radius-container": "0.75rem",
    "--radius-page": "1.25rem",
    "--radius-full": "9999px",
  },
});
