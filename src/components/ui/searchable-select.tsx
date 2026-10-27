"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { CheckIcon, ChevronDownIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import styles from "./searchable-select.module.css";

export type SearchableSelectOption = { id: string; name: string };

type Props = {
  id: string;
  label: string;
  value: string;
  options: readonly SearchableSelectOption[];
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
  variant?: "filter" | "underline";
};

const searchableText = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLocaleLowerCase("vi").trim();

export function SearchableSelect({
  id,
  label,
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
  required = false,
  invalid = false,
  variant = "filter",
}: Props) {
  const reactId = useId().replace(/:/g, "");
  const popupId = id + "-options";
  const listId = id + "-list";
  const anchor = "--search-select-" + (id + reactId).replace(/[^a-zA-Z0-9_-]/g, "");
  const choices = [{ id: "", name: placeholder }, ...options];
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const visible = choices.filter((option) => searchableText(option.name).includes(searchableText(query)));
  const activeIndex = Math.min(active, visible.length - 1);
  const current = options.find((option) => option.id === value)?.name || placeholder;

  function choose(next: string) {
    onChange(next);
    popup.current?.hidePopover();
    trigger.current?.focus();
  }

  useEffect(() => {
    if (disabled && open) popup.current?.hidePopover();
  }, [disabled, open]);

  useEffect(() => {
    if (open) search.current?.focus();
  }, [open]);

  useEffect(() => {
    if (open) popup.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, query]);

  return (
    <div className={styles.root} data-variant={variant} data-disabled={disabled} data-invalid={invalid}>
      <button
        ref={trigger}
        id={id}
        type="button"
        className={styles.trigger}
        disabled={disabled}
        popoverTarget={popupId}
        role="combobox"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={popupId}
        aria-required={required || undefined}
        aria-invalid={invalid || undefined}
        style={{ anchorName: anchor } as CSSProperties}
      >
        <span>{current}</span><ChevronDownIcon aria-hidden="true" />
      </button>
      <div
        ref={popup}
        id={popupId}
        popover="auto"
        role="dialog"
        aria-label={label}
        className={styles.popup}
        style={{ positionAnchor: anchor } as CSSProperties}
        onToggle={(event) => {
          const shown = event.newState === "open";
          setOpen(shown);
          if (shown) {
            setQuery("");
            setActive(Math.max(0, choices.findIndex((option) => option.id === value)));
          }
        }}
      >
        <div className={styles.search}>
          <MagnifyingGlassIcon aria-hidden="true" />
          <input
            ref={search}
            type="search"
            role="combobox"
            value={query}
            placeholder={`Tìm ${label.toLocaleLowerCase("vi")}…`}
            aria-label={`Tìm ${label.toLocaleLowerCase("vi")}`}
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
            onChange={(event) => { setQuery(event.target.value); setActive(0); }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                if (visible.length) setActive((index) => (Math.min(index, visible.length - 1) + (event.key === "ArrowDown" ? 1 : visible.length - 1)) % visible.length);
              } else if (event.key === "Home" || event.key === "End") {
                event.preventDefault();
                setActive(event.key === "Home" ? 0 : visible.length - 1);
              } else if (event.key === "Enter") {
                event.preventDefault();
                if (visible[activeIndex]) choose(visible[activeIndex].id);
              } else if (event.key === "Escape") {
                event.preventDefault();
                popup.current?.hidePopover();
                trigger.current?.focus();
              } else if (event.key === "Tab") {
                popup.current?.hidePopover();
              }
            }}
          />
        </div>
        <div id={listId} role="listbox" aria-label={label} className={styles.list}>
          {visible.map((option, index) => (
            <button
              key={option.id || "__all__"}
              id={`${id}-option-${index}`}
              type="button"
              role="option"
              tabIndex={-1}
              aria-selected={option.id === value}
              data-active={index === activeIndex}
              className={styles.option}
              onPointerMove={() => setActive(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option.id)}
            >
              <span>{option.name}</span>{option.id === value && <CheckIcon aria-hidden="true" />}
            </button>
          ))}
        </div>
        {!visible.length && <p className={styles.empty} role="status">Không tìm thấy kết quả</p>}
      </div>
    </div>
  );
}
