"use client";

import React, { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { DateInput } from "@astryxdesign/core/DateInput";
import { IconButton } from "@astryxdesign/core/IconButton";
import { InputGroup } from "@astryxdesign/core/InputGroup";
import { Eye, EyeOff, Search } from "lucide-react";

type IsoDateLiteral = `${number}${number}${number}${number}-${number}${number}-${number}${number}`;

function asIsoDate(value: string | undefined): IsoDateLiteral | undefined {
  if (!value) return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? (value as IsoDateLiteral) : undefined;
}
import { Field } from "@astryxdesign/core/Field";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { MultiSelector, type MultiSelectorOptionData } from "@astryxdesign/core/MultiSelector";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { RadioList, RadioListItem } from "@astryxdesign/core/RadioList";
import { Selector, type SelectorOptionData } from "@astryxdesign/core/Selector";
import { Switch } from "@astryxdesign/core/Switch";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Typeahead, type SearchSource, type SearchableItem } from "@astryxdesign/core/Typeahead";

export type SelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  icon?: ReactNode;
};

export type FieldStatusVariant = "attached" | "detached" | "tooltip";

export function AppForm({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <FormLayout direction="vertical">{children}</FormLayout>
    </div>
  );
}

export function AppField({
  label,
  description,
  error,
  statusVariant = "detached",
  isRequired,
  inputID,
  children,
}: {
  label: string;
  description?: string;
  error?: string;
  statusVariant?: FieldStatusVariant;
  isRequired?: boolean;
  inputID?: string;
  children: ReactNode;
}) {
  const generatedId = useId();
  return (
    <Field
      inputID={inputID ?? generatedId}
      label={label}
      description={description}
      isRequired={isRequired}
      status={error ? { type: "error", message: error } : undefined}
      statusVariant={statusVariant}
      width="100%"
    >
      {children}
    </Field>
  );
}

export function AppTextInput({
  label,
  value,
  onChange,
  error,
  statusVariant = "detached",
  type = "text",
  placeholder,
  description,
  isRequired,
  isDisabled,
  isReadOnly,
  isLabelHidden,
  hasClear,
  startIcon,
  onEnter,
  autoComplete,
  maxLength,
  size = "md",
  width = "100%",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  statusVariant?: FieldStatusVariant;
  type?: "text" | "password" | "email" | "search" | "tel" | "url";
  placeholder?: string;
  description?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isLabelHidden?: boolean;
  hasClear?: boolean;
  startIcon?: "search" | "calendar" | "clock" | ReactNode;
  onEnter?: () => void;
  autoComplete?: string;
  maxLength?: number;
  size?: "sm" | "md" | "lg";
  width?: number | string;
}) {
  const isSearchField = type === "search" || startIcon === "search";
  const resolvedStartIcon =
    startIcon === "search" || (type === "search" && !startIcon) ? (
      <Search className="ds-search-input-icon h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    ) : (
      startIcon
    );

  return (
    <TextInput
      label={label}
      value={value}
      onChange={(next) => {
        if (maxLength && next.length > maxLength) {
          onChange(next.slice(0, maxLength));
          return;
        }
        onChange(next);
      }}
      type={type}
      placeholder={placeholder}
      description={description}
      isRequired={isRequired}
      isDisabled={isDisabled}
      isReadOnly={isReadOnly}
      isLabelHidden={isLabelHidden}
      hasClear={hasClear}
      startIcon={resolvedStartIcon}
      controlClassName={isSearchField ? "ds-search-input" : undefined}
      onEnter={onEnter}
      autoComplete={autoComplete}
      size={size}
      width={width}
      status={error ? { type: "error", message: error } : undefined}
      statusVariant={statusVariant}
    />
  );
}

/**
 * Unified toolbar search field built on Astryx TextInput with recessed depth,
 * brand-accent focus ring, magnifying-glass icon, and clear button.
 */
export function AppSearchInput({
  label = "Tìm kiếm",
  value,
  onChange,
  placeholder = "Tìm kiếm...",
  size = "sm",
  width = "100%",
  onEnter,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  size?: "sm" | "md" | "lg";
  width?: number | string;
  onEnter?: () => void;
}) {
  return (
    <AppTextInput
      label={label}
      isLabelHidden
      type="search"
      startIcon="search"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      hasClear
      size={size}
      width={width}
      onEnter={onEnter}
    />
  );
}

/**
 * Password field built on Astryx InputGroup + TextInput + IconButton.
 * Guarantees exact vertical centering and seamless border join across sm/md/lg sizes.
 */
export function AppPasswordInput({
  label,
  value,
  onChange,
  error,
  placeholder = "Nhập mật khẩu",
  description,
  isRequired,
  isDisabled,
  autoComplete,
  onEnter,
  size = "md",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  description?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  autoComplete?: string;
  onEnter?: () => void;
  size?: "sm" | "md" | "lg";
}) {
  const [visible, setVisible] = useState(false);

  return (
    <InputGroup
      label={label}
      description={description}
      isRequired={isRequired}
      isDisabled={isDisabled}
      size={size}
      status={error ? { type: "error", message: error } : undefined}
      className="ds-password-group w-full"
    >
      <TextInput
        label={label}
        isLabelHidden
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        isDisabled={isDisabled}
        onEnter={onEnter}
        size={size}
        controlClassName="flex-1"
      />
      <IconButton
        label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        variant="ghost"
        size={size}
        isDisabled={isDisabled}
        icon={visible ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
        onClick={() => setVisible((prev) => !prev)}
      />
    </InputGroup>
  );
}

export function AppTextArea({
  label,
  value,
  onChange,
  error,
  statusVariant = "detached",
  placeholder,
  description,
  rows = 3,
  maxLength,
  isRequired,
  isDisabled,
  isReadOnly,
  isLabelHidden,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  statusVariant?: FieldStatusVariant;
  placeholder?: string;
  description?: string;
  rows?: number;
  maxLength?: number;
  isRequired?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isLabelHidden?: boolean;
}) {
  return (
    <TextArea
      label={label}
      value={value}
      onChange={(next) => onChange(next)}
      placeholder={placeholder}
      description={description}
      rows={rows}
      maxLength={maxLength}
      isRequired={isRequired}
      isDisabled={isDisabled}
      isReadOnly={isReadOnly}
      isLabelHidden={isLabelHidden}
      status={error ? { type: "error", message: error } : undefined}
      statusVariant={statusVariant}
    />
  );
}

export function AppNumberInput({
  label,
  value,
  onChange,
  error,
  statusVariant = "detached",
  min,
  max,
  step = 1,
  placeholder,
  description,
  isRequired,
  isDisabled,
  isReadOnly,
  size = "md",
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string;
  statusVariant?: FieldStatusVariant;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  description?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <NumberInput
      label={label}
      value={value}
      onChange={(next) => onChange(Number.isFinite(next) ? next : null)}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      description={description}
      isRequired={isRequired}
      isDisabled={isDisabled}
      isReadOnly={isReadOnly}
      size={size}
      status={error ? { type: "error", message: error } : undefined}
      statusVariant={statusVariant}
    />
  );
}

export function AppDateInput({
  label,
  value,
  onChange,
  error,
  statusVariant = "detached",
  min,
  max,
  placeholder = "Chọn ngày...",
  description,
  isRequired,
  isDisabled,
  isLabelHidden,
  hasClear = true,
  size = "md",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  statusVariant?: FieldStatusVariant;
  min?: string;
  max?: string;
  placeholder?: string;
  description?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  isLabelHidden?: boolean;
  hasClear?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <DateInput
      label={label}
      value={asIsoDate(value)}
      onChange={(next) => onChange(next ?? "")}
      min={asIsoDate(min)}
      max={asIsoDate(max)}
      placeholder={placeholder}
      description={description}
      isRequired={isRequired}
      isDisabled={isDisabled}
      isLabelHidden={isLabelHidden}
      hasClear={hasClear}
      size={size}
      status={error ? { type: "error", message: error } : undefined}
      statusVariant={statusVariant}
    />
  );
}

export function AppSelect({
  label,
  options,
  value,
  onChange,
  error,
  statusVariant = "detached",
  placeholder = "Chọn...",
  description,
  disabledMessage,
  isRequired,
  isDisabled,
  isReadOnly,
  isLabelHidden,
  hasClear = true,
  hasSearch = true,
  size = "md",
  width = "100%",
}: {
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  statusVariant?: FieldStatusVariant;
  placeholder?: string;
  description?: string;
  disabledMessage?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isLabelHidden?: boolean;
  hasClear?: boolean;
  hasSearch?: boolean;
  size?: "sm" | "md" | "lg";
  width?: number | string;
}) {
  const mapped: SelectorOptionData[] = useMemo(
    () =>
      options.map((opt) => ({
        value: opt.value,
        label: opt.label,
        description: opt.description,
        disabled: opt.disabled,
        icon: opt.icon,
      })),
    [options],
  );

  const sharedProps = {
    label,
    options: mapped,
    placeholder,
    description,
    disabledMessage,
    isRequired,
    isDisabled,
    isReadOnly,
    isLabelHidden,
    hasSearch,
    searchPlaceholder: "Tìm kiếm...",
    emptyText: "Không có dữ liệu",
    emptySearchText: "Không tìm thấy kết quả",
    size,
    width,
    status: error ? ({ type: "error", message: error } as const) : undefined,
    statusVariant,
  };

  if (hasClear) {
    return (
      <Selector
        {...sharedProps}
        hasClear={true}
        value={value || null}
        onChange={(next) => onChange(next ?? "")}
      />
    );
  }

  return (
    <Selector
      {...sharedProps}
      hasClear={false}
      value={value}
      onChange={(next) => onChange(next)}
    />
  );
}

export function AppMultiSelect({
  label,
  options,
  value,
  onChange,
  error,
  statusVariant = "detached",
  placeholder = "Chọn nhiều...",
  description,
  disabledMessage,
  isRequired,
  isDisabled,
  isLabelHidden,
  isLoading,
  size = "md",
  width = "100%",
}: {
  label: string;
  options: SelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
  statusVariant?: FieldStatusVariant;
  placeholder?: string;
  description?: string;
  disabledMessage?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  isLabelHidden?: boolean;
  isLoading?: boolean;
  size?: "sm" | "md" | "lg";
  width?: number | string;
}) {
  const mapped: MultiSelectorOptionData[] = useMemo(
    () =>
      options.map((opt) => ({
        value: opt.value,
        label: opt.label,
        description: opt.description,
        disabled: opt.disabled,
        icon: opt.icon,
      })),
    [options],
  );

  return (
    <MultiSelector
      label={label}
      options={mapped}
      value={value}
      onChange={(next) => onChange(next)}
      placeholder={placeholder}
      description={description}
      disabledMessage={disabledMessage}
      isRequired={isRequired}
      isDisabled={isDisabled}
      isLabelHidden={isLabelHidden}
      isLoading={isLoading}
      hasSearch
      searchPlaceholder="Tìm kiếm..."
      emptyText="Không có dữ liệu"
      emptySearchText="Không tìm thấy kết quả"
      size={size}
      width={width}
      status={error ? { type: "error", message: error } : undefined}
      statusVariant={statusVariant}
    />
  );
}

/**
 * Async searchable combobox backed by Astryx Typeahead with automatic AbortController cancellation.
 */
export function AppAsyncCombobox<TAux = unknown>({
  label,
  value,
  onChange,
  onSearch,
  placeholder = "Nhập để tìm kiếm...",
  description,
  error,
  statusVariant = "detached",
  disabledMessage,
  isRequired,
  isDisabled,
  isLabelHidden,
  debounceMs = 350,
  minQueryLength = 1,
  renderItem,
}: {
  label: string;
  value: SearchableItem<TAux> | null;
  onChange: (item: SearchableItem<TAux> | null) => void;
  onSearch: (query: string, signal: AbortSignal) => Promise<SearchableItem<TAux>[]>;
  placeholder?: string;
  description?: string;
  error?: string;
  statusVariant?: FieldStatusVariant;
  disabledMessage?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  isLabelHidden?: boolean;
  debounceMs?: number;
  minQueryLength?: number;
  renderItem?: (item: SearchableItem<TAux>) => ReactNode;
}) {
  const controllerRef = useRef<AbortController | null>(null);
  const searchFnRef = useRef(onSearch);
  searchFnRef.current = onSearch;

  const searchSource = useMemo<SearchSource<SearchableItem<TAux>>>(
    () => ({
      bootstrap() {
        return [];
      },
      cancel() {
        controllerRef.current?.abort();
        controllerRef.current = null;
      },
      async search(query: string) {
        controllerRef.current?.abort();
        const ctrl = new AbortController();
        controllerRef.current = ctrl;
        try {
          return await searchFnRef.current(query, ctrl.signal);
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") {
            return [];
          }
          throw err;
        }
      },
    }),
    [],
  );

  return (
    <Typeahead
      label={label}
      searchSource={searchSource}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      description={description}
      disabledMessage={disabledMessage}
      isRequired={isRequired}
      isDisabled={isDisabled}
      isLabelHidden={isLabelHidden}
      debounceMs={debounceMs}
      minQueryLength={minQueryLength}
      hasClear
      emptySearchText="Không tìm thấy kết quả phù hợp"
      renderItem={renderItem}
      status={error ? { type: "error", message: error } : undefined}
      statusVariant={statusVariant}
    />
  );
}

export function AppSwitch({
  label,
  value,
  onChange,
  description,
  isDisabled,
  labelPosition = "end",
  labelSpacing = "spread",
}: {
  label: string;
  value: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  isDisabled?: boolean;
  labelPosition?: "start" | "end";
  labelSpacing?: "hug" | "spread";
}) {
  return (
    <Switch
      label={label}
      value={value}
      onChange={(checked) => onChange(checked)}
      description={description}
      isDisabled={isDisabled}
      labelPosition={labelPosition}
      labelSpacing={labelSpacing}
      width="100%"
    />
  );
}

export function AppCheckbox({
  label,
  value,
  onChange,
  description,
  isDisabled,
  isLoading,
  isLabelHidden,
}: {
  label: string;
  value: boolean | "indeterminate";
  onChange: (checked: boolean) => void;
  description?: string;
  isDisabled?: boolean;
  isLoading?: boolean;
  isLabelHidden?: boolean;
}) {
  return (
    <CheckboxInput
      label={label}
      value={value}
      onChange={(checked) => onChange(checked)}
      description={description}
      isDisabled={isDisabled}
      isLoading={isLoading}
      isLabelHidden={isLabelHidden}
    />
  );
}

export function AppRadioList({
  label,
  value,
  onChange,
  options,
  orientation = "horizontal",
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; description?: string; disabled?: boolean }>;
  orientation?: "horizontal" | "vertical";
  error?: string;
}) {
  return (
    <RadioList
      label={label}
      value={value}
      onChange={onChange}
      orientation={orientation}
      status={error ? { type: "error", message: error } : undefined}
    >
      {options.map((opt) => (
        <RadioListItem
          key={opt.value}
          value={opt.value}
          label={opt.label}
          description={opt.description}
          isDisabled={opt.disabled}
        />
      ))}
    </RadioList>
  );
}
