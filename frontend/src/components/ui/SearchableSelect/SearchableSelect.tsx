import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import "./searchableSelect.css";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

// Typeahead replacement for a plain <select> (§11: dropdowns with >~8
// options must be searchable). The displayed value only ever changes on an
// explicit commit — a click, or Enter on a highlighted row — never from
// typing alone, so narrowing the list to a single match never silently
// selects it. Escape (and clicking away) closes the list and reverts to
// whatever was actually selected before, discarding the typed query.
export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "-- Select --",
  disabled,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value) || null;
  const filteredOptions = isOpen
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeWithoutChange();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const openList = () => {
    if (disabled) return;
    setQuery("");
    setHighlightedIndex(-1);
    setIsOpen(true);
  };

  const closeWithoutChange = () => {
    setIsOpen(false);
    setQuery("");
    setHighlightedIndex(-1);
  };

  const commitSelection = (opt: SearchableSelectOption) => {
    onChange(opt.value);
    setIsOpen(false);
    setQuery("");
    setHighlightedIndex(-1);
  };

  const handleQueryChange = (nextQuery: string) => {
    setQuery(nextQuery);
    setIsOpen(true);
    const nextFiltered = options.filter((o) =>
      o.label.toLowerCase().includes(nextQuery.trim().toLowerCase())
    );
    // Auto-highlight the top match so Enter can confirm it immediately —
    // this only moves the highlight, it never commits a value by itself.
    setHighlightedIndex(nextFiltered.length > 0 ? 0 : -1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        openList();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, filteredOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        commitSelection(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      // Stop here so the parent Modal's own Escape-to-close listener
      // doesn't also fire — the first Escape should only dismiss this
      // list, not the whole form.
      e.preventDefault();
      e.stopPropagation();
      closeWithoutChange();
    }
  };

  return (
    <div className="sa-searchable-select" ref={containerRef}>
      <input
        id={id}
        type="text"
        className="sa-input"
        placeholder={placeholder}
        value={isOpen ? query : selectedOption?.label ?? ""}
        disabled={disabled}
        autoComplete="off"
        onFocus={openList}
        onChange={(e) => handleQueryChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <ChevronDown size={16} className="sa-searchable-select-caret" />
      {isOpen && (
        <div className="sa-searchable-select-list" role="listbox">
          {filteredOptions.length === 0 ? (
            <div className="sa-searchable-select-empty">No matches found</div>
          ) : (
            filteredOptions.map((opt, i) => (
              <div
                key={opt.value || "__empty__"}
                role="option"
                aria-selected={opt.value === value}
                className={`sa-searchable-select-option ${i === highlightedIndex ? "is-highlighted" : ""} ${opt.value === value ? "is-selected" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  commitSelection(opt);
                }}
                onMouseEnter={() => setHighlightedIndex(i)}
              >
                {opt.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
