import { useEffect, useMemo, useState, useTransition } from 'react'
import { FileUpload } from './components/FileUpload'
import { SearchableSelect } from './components/SearchableSelect'
import type { CatalogItem, MatchFilter } from './types'
import {
  buildMappings,
  exportMappingsToExcel,
  exportMappingsToJson,
  parseCatalogFromWorkbook,
  validateMappings,
} from './utils/excel'
import './App.css'

const STORAGE_KEY = 'oe-or-matcher-v1'

interface PersistedState {
  oeItems: CatalogItem[]
  orItems: CatalogItem[]
  matchMap: Record<string, string>
  oeFileName?: string
  orFileName?: string
}

function loadPersisted(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedState
  } catch {
    return null
  }
}

export default function App() {
  const persisted = loadPersisted()
  const [oeItems, setOeItems] = useState<CatalogItem[]>(persisted?.oeItems ?? [])
  const [orItems, setOrItems] = useState<CatalogItem[]>(persisted?.orItems ?? [])
  const [matchMap, setMatchMap] = useState<Record<string, string>>(
    persisted?.matchMap ?? {},
  )
  const [oeFileName, setOeFileName] = useState(persisted?.oeFileName ?? '')
  const [orFileName, setOrFileName] = useState(persisted?.orFileName ?? '')
  const [oeQuery, setOeQuery] = useState('')
  const [filter, setFilter] = useState<MatchFilter>('all')
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  useEffect(() => {
    const payload: PersistedState = {
      oeItems,
      orItems,
      matchMap,
      oeFileName,
      orFileName,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [oeItems, orItems, matchMap, oeFileName, orFileName])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2800)
    return () => clearTimeout(t)
  }, [toast])

  const usedOrCodes = useMemo(() => {
    const set = new Set<string>()
    for (const code of Object.values(matchMap)) {
      if (code) set.add(code.toLowerCase())
    }
    return set
  }, [matchMap])

  const mappings = useMemo(
    () => buildMappings(oeItems, matchMap, orItems),
    [oeItems, matchMap, orItems],
  )

  const issues = useMemo(() => validateMappings(mappings), [mappings])

  const duplicateOrCodes = useMemo(() => {
    const set = new Set<string>()
    for (const issue of issues) {
      if (issue.type === 'duplicate_or') set.add(issue.code.toLowerCase())
    }
    return set
  }, [issues])

  const stats = useMemo(() => {
    const matched = oeItems.filter((o) => matchMap[o.code]).length
    return {
      total: oeItems.length,
      matched,
      unmatched: oeItems.length - matched,
      orTotal: orItems.length,
      issues: issues.length,
    }
  }, [oeItems, matchMap, orItems, issues])

  const visibleOe = useMemo(() => {
    const q = oeQuery.trim().toLowerCase()
    return oeItems.filter((item) => {
      const matched = Boolean(matchMap[item.code])
      if (filter === 'matched' && !matched) return false
      if (filter === 'unmatched' && matched) return false
      if (!q) return true
      return (
        item.code.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        (matchMap[item.code] ?? '').toLowerCase().includes(q)
      )
    })
  }, [oeItems, oeQuery, filter, matchMap])

  const readExcel = async (
    file: File,
    kind: 'oe' | 'or',
  ): Promise<void> => {
    setError(null)
    try {
      const buffer = await file.arrayBuffer()
      const { items, duplicateCodes } = parseCatalogFromWorkbook(buffer)
      if (items.length === 0) {
        setError(
          `Не удалось прочитать данные из «${file.name}». Нужны столбцы «Код» и «Наименование».`,
        )
        return
      }
      const dupNote =
        duplicateCodes.length > 0
          ? ` (пропущено дублей кодов: ${duplicateCodes.length})`
          : ''
      startTransition(() => {
        if (kind === 'oe') {
          setOeItems(items)
          setOeFileName(file.name)
          setMatchMap((prev) => {
            const next: Record<string, string> = {}
            for (const item of items) {
              if (prev[item.code]) next[item.code] = prev[item.code]
            }
            return next
          })
          setToast(`Загружено ОЭ: ${items.length}${dupNote}`)
        } else {
          setOrItems(items)
          setOrFileName(file.name)
          setMatchMap((prev) => {
            const codes = new Set(items.map((i) => i.code.toLowerCase()))
            const next: Record<string, string> = {}
            for (const [oe, or] of Object.entries(prev)) {
              if (or && codes.has(or.toLowerCase())) next[oe] = or
            }
            return next
          })
          setToast(`Загружено ОР: ${items.length}${dupNote}`)
        }
      })
    } catch {
      setError(`Ошибка чтения файла «${file.name}».`)
    }
  }

  const setMatch = (oeCode: string, orCode: string) => {
    setMatchMap((prev) => {
      const next = { ...prev }
      if (!orCode) delete next[oeCode]
      else next[oeCode] = orCode
      return next
    })
  }

  const clearAllMatches = () => {
    if (!confirm('Очистить все сопоставления?')) return
    setMatchMap({})
    setToast('Сопоставления очищены')
  }

  const resetAll = () => {
    if (!confirm('Сбросить загруженные данные и сопоставления?')) return
    setOeItems([])
    setOrItems([])
    setMatchMap({})
    setOeFileName('')
    setOrFileName('')
    localStorage.removeItem(STORAGE_KEY)
    setToast('Данные сброшены')
  }

  const handleExportExcel = () => {
    if (mappings.length === 0) {
      setError('Нет сопоставлений для экспорта')
      return
    }
    if (issues.length > 0) {
      const ok = confirm(
        `Найдено проблем: ${issues.length}. Всё равно экспортировать в Excel?`,
      )
      if (!ok) return
    }
    exportMappingsToExcel(mappings, `sopostavlenie_oe_or_${dateStamp()}.xlsx`)
    setToast(`Excel: ${mappings.length} строк`)
  }

  const handleExportJson = () => {
    if (mappings.length === 0) {
      setError('Нет сопоставлений для экспорта')
      return
    }
    if (issues.length > 0) {
      const ok = confirm(
        `Найдено проблем: ${issues.length}. Всё равно экспортировать в JSON?`,
      )
      if (!ok) return
    }
    exportMappingsToJson(mappings, `sopostavlenie_oe_or_${dateStamp()}.json`)
    setToast(`JSON: ${mappings.length} записей`)
  }

  const ready = oeItems.length > 0 && orItems.length > 0

  return (
    <div className="app">
      <div className="app__glow" aria-hidden />
      <header className="header">
        <div className="header__brand">
          <p className="header__eyebrow">1С ERP × 1С ТОИР</p>
          <h1 className="header__title">Сопоставление ОЭ и ОР</h1>
          <p className="header__subtitle">
            Загрузите справочники, найдите объект ремонта для каждого объекта
            эксплуатации и сохраните результат в Excel или JSON.
          </p>
        </div>
        <div className="header__actions">
          <button type="button" className="btn btn--ghost" onClick={resetAll}>
            Сбросить
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={clearAllMatches}
            disabled={stats.matched === 0}
          >
            Очистить сопоставления
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={handleExportJson}
            disabled={mappings.length === 0}
          >
            JSON
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleExportExcel}
            disabled={mappings.length === 0}
          >
            Excel
          </button>
        </div>
      </header>

      {(toast || error) && (
        <div className={`banner ${error ? 'banner--error' : 'banner--ok'}`} role="status">
          <span>{error ?? toast}</span>
          <button
            type="button"
            className="banner__close"
            onClick={() => {
              setError(null)
              setToast(null)
            }}
          >
            ×
          </button>
        </div>
      )}

      <section className="uploads">
        <FileUpload
          label="Объекты эксплуатации (ОЭ)"
          hint="Excel: столбцы «Код» и «Наименование» (~800 строк)"
          count={oeItems.length}
          loadedName={oeFileName}
          onFile={(f) => void readExcel(f, 'oe')}
        />
        <FileUpload
          label="Объекты ремонта (ОР)"
          hint="Excel: столбцы «Код» и «Наименование» (~2000 строк)"
          count={orItems.length}
          loadedName={orFileName}
          onFile={(f) => void readExcel(f, 'or')}
        />
      </section>

      <section className="stats" aria-label="Статистика">
        <div className="stat">
          <span className="stat__value">{stats.total}</span>
          <span className="stat__label">ОЭ</span>
        </div>
        <div className="stat">
          <span className="stat__value">{stats.orTotal}</span>
          <span className="stat__label">ОР</span>
        </div>
        <div className="stat stat--ok">
          <span className="stat__value">{stats.matched}</span>
          <span className="stat__label">Сопоставлено</span>
        </div>
        <div className="stat">
          <span className="stat__value">{stats.unmatched}</span>
          <span className="stat__label">Без пары</span>
        </div>
        <div className={`stat ${stats.issues ? 'stat--warn' : ''}`}>
          <span className="stat__value">{stats.issues}</span>
          <span className="stat__label">Проблемы</span>
        </div>
      </section>

      {issues.length > 0 && (
        <section className="issues">
          <h2>Проверка дубликатов</h2>
          <ul>
            {issues.map((issue) => (
              <li key={`${issue.type}-${issue.code}`}>
                <strong>
                  {issue.type === 'duplicate_or' ? 'Повтор ОР' : 'Повтор ОЭ'}
                </strong>
                : {issue.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!ready ? (
        <section className="empty">
          <h2>Начните с загрузки двух таблиц</h2>
          <p>
            ОЭ — основа списка. Для каждой строки выберите ОР из выпадающего
            списка с поиском по коду и наименованию.
          </p>
        </section>
      ) : (
        <section className="workspace">
          <div className="toolbar">
            <input
              className="toolbar__search"
              type="search"
              placeholder="Фильтр по ОЭ или коду ОР…"
              value={oeQuery}
              onChange={(e) => setOeQuery(e.target.value)}
            />
            <div className="toolbar__filters" role="group" aria-label="Фильтр статуса">
              {(
                [
                  ['all', 'Все'],
                  ['unmatched', 'Без пары'],
                  ['matched', 'Сопоставленные'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`chip ${filter === key ? 'is-active' : ''}`}
                  onClick={() => setFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="toolbar__count">
              Показано {visibleOe.length} из {oeItems.length}
            </span>
          </div>

          <div className="table-wrap">
            <table className="match-table">
              <thead>
                <tr>
                  <th className="col-num">№</th>
                  <th className="col-code">Код ОЭ</th>
                  <th className="col-name">Наименование ОЭ</th>
                  <th className="col-or">Объект ремонта (ОР)</th>
                  <th className="col-status">Статус</th>
                </tr>
              </thead>
              <tbody>
                {visibleOe.map((oe, index) => {
                  const orCode = matchMap[oe.code] ?? ''
                  const isDup =
                    orCode && duplicateOrCodes.has(orCode.toLowerCase())
                  return (
                    <tr
                      key={oe.code}
                      className={
                        isDup ? 'is-dup' : orCode ? 'is-matched' : undefined
                      }
                    >
                      <td className="col-num">{index + 1}</td>
                      <td className="col-code">
                        <code>{oe.code}</code>
                      </td>
                      <td className="col-name">{oe.name}</td>
                      <td className="col-or">
                        <SearchableSelect
                          items={orItems}
                          value={orCode}
                          usedCodes={usedOrCodes}
                          onChange={(code) => setMatch(oe.code, code)}
                        />
                      </td>
                      <td className="col-status">
                        {isDup ? (
                          <span className="status status--warn">Дубликат ОР</span>
                        ) : orCode ? (
                          <span className="status status--ok">OK</span>
                        ) : (
                          <span className="status">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {visibleOe.length === 0 && (
              <p className="table-empty">Нет строк по текущему фильтру</p>
            )}
          </div>
        </section>
      )}

      <footer className="footer">
        Результат: 4 столбца — Код ОЭ, Наименование ОЭ, Код ОР, Наименование ОР.
        Прогресс сохраняется в браузере.
      </footer>
    </div>
  )
}

function dateStamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`
}
