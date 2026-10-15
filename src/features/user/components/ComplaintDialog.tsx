"use client";

interface ComplaintDialogProps {
  open: boolean;
  value: string;
  loading?: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export default function ComplaintDialog({
  open,
  value,
  loading = false,
  onChange,
  onClose,
  onSubmit,
}: ComplaintDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-gray-900">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">
            Báo với admin
          </h2>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
            Nhập thông tin sai hoặc cần báo với admin:
          </p>

          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            autoFocus
            placeholder="Nhập nội dung tại đây..."
            className="
              w-full
              resize-y
              rounded-lg
              border
              border-gray-300
              bg-gray-50
              px-3
              py-2
              text-sm
              outline-none
              transition
              focus:border-red-500
              focus:ring-1
              focus:ring-red-500
              dark:border-gray-700
              dark:bg-gray-800
              dark:text-white
            "
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="
              rounded-md
              px-5
              py-2
              text-sm
              text-gray-700
              hover:bg-gray-100
              disabled:opacity-50
              dark:text-gray-200
              dark:hover:bg-gray-800
            "
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className="
              rounded-md
              bg-red-500
              px-6
              py-2
              text-sm
              font-semibold
              text-white
              shadow-sm
              hover:bg-red-600
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {loading ? "Đang gửi..." : "Xác nhận"}
          </button>
        </div>
      </div>
    </div>
  );
}