"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { organizationApi } from "../service/organizationApi";

export interface ManagerOption {
  id: string;
  fullName?: string;
  jobTitle?: string;
  departmentName?: string;
  companyName?: string;
  employeeCode?: string;
  organizationId?: number
}

interface ManagerSearchProps {
  userId: string;
  value?: string;
  initialManager?: ManagerOption | null;
  disabled?: boolean;
  onChange: (manager?: ManagerOption) => void;
}

export default function ManagerSearch({
  userId,
  value,
  initialManager,
  disabled = false,
  onChange,
}: ManagerSearchProps) {
  const [keyword, setKeyword] = useState("");

  const [options, setOptions] =
    useState<ManagerOption[]>([]);

  const [selectedManager, setSelectedManager] =
    useState<ManagerOption | null>(null);

  const [open, setOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const wrapperRef =
    useRef<HTMLDivElement>(null);

  /*
   * =========================================================
   * Sync manager hiện tại
   * =========================================================
   *
   * Khi edit:
   *
   * value:
   *   "nguyenminhgiangdeocavn"
   *
   * initialManager:
   * {
   *   id: "nguyenminhgiangdeocavn",
   *   fullName: "Nguyễn Minh Giang",
   *   ...
   * }
   *
   * => input sẽ hiển thị manager hiện tại.
   */
useEffect(() => {
  if (!value) {
    setSelectedManager(null);
    return;
  }

  if (
    initialManager &&
    initialManager.id === value
  ) {
    setSelectedManager(initialManager);
    return;
  }

  const existing = options.find(
    item => item.id === value
  );

  if (existing) {
    setSelectedManager(existing);
  }
}, [value, initialManager]);

  /*
   * =========================================================
   * Search manager
   * =========================================================
   *
   * Giống behavior Blazor:
   *
   * - Không load manager khi mở dialog.
   * - Chỉ search khi user nhập keyword.
   * - Debounce 1000ms.
   *
   * Backend response thực tế:
   *
   * [
   *   {
   *     "id": 3229,
   *     "userId": "...",
   *     "managerID": "nguyenminhgiangdeocavn",
   *     "managerName": "Nguyễn Minh Giang",
   *     ...
   *   }
   * ]
   */
  useEffect(() => {
    if (
      disabled ||
      !userId
    ) {
      setOptions([]);
      setOpen(false);
      setLoading(false);

      return;
    }

    const searchKeyword =
      keyword.trim();

    /*
     * Không có keyword
     * => không search.
     */
    if (!searchKeyword) {
      setOptions([]);
      setOpen(false);
      setLoading(false);

      return;
    }

    /*
     * Debounce 1000ms
     */
    const timer =
      setTimeout(async () => {
        try {
          setLoading(true);

          const result =
            await organizationApi.searchManagers(
              userId,
              searchKeyword
            );

          /*
           * Backend trả về ARRAY trực tiếp.
           *
           * Không phải:
           *
           * {
           *   items: [...]
           * }
           */
          const rawItems =
            Array.isArray(result)
              ? result
              : result?.items ?? [];

          /*
           * =================================================
           * Convert backend DTO -> ManagerOption
           * =================================================
           *
           * Backend dùng:
           *
           * managerID
           *
           * không phải:
           *
           * managerId
           */
         const managerMap = new Map<
            string,
            ManagerOption
          >();

        for (const item of rawItems) {
          /*
          * Đây mới là USER của organization record.
          * Không lấy item.managerID vì đó là
          * quản lý của user hiện tại.
          */
          const managerId =
            item.userId ?? "";

          if (!managerId) {
            continue;
          }

          /*
          * Một user có thể có nhiều organization
          * => chỉ hiển thị một lần.
          */
          if (managerMap.has(managerId)) {
            continue;
          }

          managerMap.set(
            managerId,
            {
              id: managerId,

              fullName:
                item.userName ??
                "",

              jobTitle:
                item.jobTitle ??
                "",

              departmentName:
                item.departmentName ??
                "",

              companyName:
                item.companyName ??
                "",

              employeeCode:
                item.employeeCode ??
                "",

                organizationId: item.id,
            }
          );
        }
          const items =
            Array.from(
              managerMap.values()
            );

          console.log(
            "🔎 Manager options:",
            items
          );

          setOptions(items);
          setOpen(true);
        } catch (error) {
          console.error(
            "Manager search error:",
            error
          );

          setOptions([]);

          /*
           * Vẫn mở dropdown để hiển thị
           * "Không tìm thấy người quản lý".
           */
          setOpen(true);
        } finally {
          setLoading(false);
        }
      }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [
    keyword,
    disabled,
    userId,
  ]);

  /*
   * =========================================================
   * Click outside
   * =========================================================
   */
  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent
    ) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  /*
   * =========================================================
   * Select manager
   * =========================================================
   */
  const handleSelect = (
    manager: ManagerOption
  ) => {
    /*
     * Hiển thị manager vừa chọn.
     */
    setSelectedManager(
      manager
    );

    /*
     * Xóa keyword search.
     */
    setKeyword("");

    /*
     * Xóa kết quả search.
     */
    setOptions([]);

    /*
     * Đóng dropdown.
     */
    setOpen(false);

    /*
     * Cập nhật form.managerId
     */
    onChange(manager);
  };

  /*
   * =========================================================
   * Clear manager
   * =========================================================
   */
  const handleClear = () => {
    setSelectedManager(null);

    setKeyword("");

    setOptions([]);

    setOpen(false);

    onChange(undefined);
  };

  /*
   * =========================================================
   * Input value
   * =========================================================
   */
const inputValue =
  selectedManager
    ? getManagerDisplayName(selectedManager)
    : keyword;

return (
  <div
    ref={wrapperRef}
    className="relative w-full"
  >
    {/* =====================================================
        SEARCH INPUT
    ===================================================== */}
    <div className="relative w-full">
      {/* Search icon */}
      <div
        className="
          pointer-events-none
          absolute
          left-0
          top-1/2
          z-10
          -translate-y-1/2
          text-[rgb(var(--color-muted))]
        "
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </div>

      {/* Input */}
      <input
        id="managerId"
        type="text"
        value={inputValue}
        disabled={disabled}
        placeholder={
          disabled
            ? "Vui lòng chọn phòng ban"
            : "Tìm quản lý theo tên, chức vụ, công ty hoặc phòng ban"
        }
        onChange={event => {
          const nextKeyword = event.target.value;

          setSelectedManager(null);
          setKeyword(nextKeyword);

          // Manager cũ không còn được chọn
          if (value) {
            onChange(undefined);
          }

          setOpen(
            nextKeyword.trim().length > 0
          );
        }}
        onFocus={() => {
          if (
            !disabled &&
            options.length > 0
          ) {
            setOpen(true);
          }
        }}
        className="
          h-9
          w-full
          border-0
          bg-transparent
          px-8
          pr-8
          text-sm
          text-[rgb(var(--color-text))]
          outline-none
          placeholder:text-[rgb(var(--color-muted))]
          focus:outline-none
          focus:ring-0
          disabled:cursor-not-allowed
          disabled:opacity-60
        "
      />

      {/* ===================================================
          LOADING
      =================================================== */}
      {loading && (
        <div
          className="
            pointer-events-none
            absolute
            right-0
            top-1/2
            -translate-y-1/2
          "
        >
          <div
            className="
              h-4
              w-4
              animate-spin
              rounded-full
              border-2
              border-[rgb(var(--color-border))]
              border-t-[rgb(var(--color-brand))]
            "
          />
        </div>
      )}

      {/* ===================================================
          CLEAR
      =================================================== */}
      {!loading &&
        !disabled &&
        selectedManager && (
          <button
            type="button"
            onClick={handleClear}
            className="
              absolute
              right-0
              top-1/2
              -translate-y-1/2
              text-[rgb(var(--color-muted))]
              transition
              hover:text-[rgb(var(--color-text))]
            "
            aria-label="Xóa người quản lý"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12" />
              <path d="M18 6 6 18" />
            </svg>
          </button>
        )}
    </div>

    {/* =====================================================
        DROPDOWN
    ===================================================== */}
    {open &&
      !loading &&
      options.length > 0 && (
        <div
          className="
            absolute
            left-0
            right-0
            top-full
            z-[100]
            mt-1
            w-full
            min-w-0
            max-h-[min(320px,40vh)]
            overflow-y-auto
            overscroll-contain
            rounded-lg
            border
            border-[rgb(var(--color-border))]
            bg-[rgb(var(--color-surface))]
            shadow-[var(--shadow-card)]
          "
        >
          {options.map(manager => (
            <button
              key={manager.id}
              type="button"
              onClick={() => handleSelect(manager)}
              className="
                block
                w-full
                min-h-[58px]
                border-b
                border-[rgb(var(--color-border))]
                px-3
                py-2.5
                text-left
                transition
                last:border-b-0
                hover:bg-[rgb(var(--color-page))]
                focus:bg-[rgb(var(--color-page))]
                focus:outline-none
              "
            >
              {/* =================================================
                  Manager display
                  Tên - Chức vụ - Phòng ban - Công ty
              ================================================= */}
              <div
                className="
                  truncate
                  text-sm
                  font-medium
                  text-[rgb(var(--color-text))]
                "
                title={getManagerDisplayName(manager)}
              >
                {getManagerDisplayName(manager)}
              </div>
            </button>
          ))}
        </div>
      )}

    {/* =====================================================
        NO RESULT
    ===================================================== */}
    {open &&
      !loading &&
      keyword.trim() &&
      options.length === 0 && (
        <div
          className="
            absolute
            left-0
            right-0
            top-full
            z-[100]
            mt-1
            w-full
            rounded-lg
            border
            border-[rgb(var(--color-border))]
            bg-[rgb(var(--color-surface))]
            px-3
            py-3
            text-sm
            text-[rgb(var(--color-muted))]
            shadow-[var(--shadow-card)]
          "
        >
          Không tìm thấy người quản lý
        </div>
      )}
  </div>
);
}

function getManagerDisplayName(
  manager: ManagerOption
): string {
  return [
    manager.fullName,
    manager.jobTitle,
    manager.departmentName,
    manager.companyName,
  ]
    .filter(Boolean)
    .join(" - ");
}