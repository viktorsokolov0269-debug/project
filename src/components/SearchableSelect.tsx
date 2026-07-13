import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import type { CatalogItem } from '../types'
import { filterItems } from '../utils/excel'

interface SearchableSelectProps {
  items: CatalogItem[]
  value: string
  onChange: (code: string) => void
  usedCodes: Set<string>
  placeholder?: string
  disabled?: boolean
}

export function SearchableSelect({
  items,
  value,
  onChange,
  usedCodes,
  placeholder = 'Найти ОР по коду или наименованию…',
  disabled = false,
}: SearchableSelectProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)

  const selected = useMemo(
    () => items.find((i) => i.code === value) ?? null,
    [items, value],
  )

  const filtered = useMemo(() => {
    return filterItems(items, query, usedCodes, value || undefined).slice(0, 80)
  }, [items, query, usedCodes, value])

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  useEffect(() => {
    setHighlight(0)
  }, [query, open])

  const pick = (code: string) => {
    onChange(code)
    setOpen(false)
    setQuery('')
  }

  const clear = () => {
    onChange('')
    setQuery('')
    setOpen(false)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true)
      return
    }
    if (!open) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, Math.max(filtered.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = filtered[highlight]
      if (item) pick(item.code)
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div className={`search-select ${open ? 'is-open' : ''}`} ref={rootRef}>
      {selected && !open ? (
        <button
          type="button"
          className="search-select__value"
          onClick={() => {
            if (disabled) return
            setOpen(true)
            setTimeout(() => inputRef.current?.focus(), 0)
          }}
          disabled={disabled}
        >
          <span className="search-select__code">{selected.code}</span>
          <span className="search-select__name">{selected.name}</span>
          <span className="search-select__actions">
            <span
              className="search-select__clear"
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation()
                clear()
              }}
              title="Очистить"
            >
              ×
            </span>
            <span className="search-select__chevron" aria-hidden>
              ▾
            </span>
          </span>
        </button>
      ) : (
        <input
          ref={inputRef}
          className="search-select__input"
          value={open ? query : selected ? `${selected.code} — ${selected.name}` : query}
          placeholder={placeholder}
          disabled={disabled}
          aria-expanded={open}
          aria-controls={listId}
          role="combobox"
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onKeyDown={onKeyDown}
        />
      )}

      {open && (
        <ul className="search-select__list" id={listId} role="listbox">
          {filtered.length === 0 && (
            <li className="search-select__empty">Ничего не найдено</li>
          )}
          {filtered.map((item, idx) => (
              <li key={item.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={item.code === value}
                  className={`search-select__option ${idx === highlight ? 'is-active' : ''}`}
                  onMouseEnter={() => setHighlight(idx)}
                  onClick={() => pick(item.code)}
                >
                  <span className="search-select__code">{item.code}</span>
                  <span className="search-select__name">{item.name}</span>
                </button>
              </li>
            ))}
          {filterItems(items, query, usedCodes, value || undefined).length > 80 && (
            <li className="search-select__hint">
              Показаны первые 80 — уточните запрос
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
