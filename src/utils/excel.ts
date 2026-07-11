import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import type { CatalogItem, Mapping, ValidationIssue } from '../types'

const CODE_HEADERS = [
  'код',
  'code',
  'кодэлемента',
  'артикул',
  'номер',
  'id',
  'код оэ',
  'код ор',
  'код объекта',
]

const NAME_HEADERS = [
  'наименование',
  'название',
  'name',
  'описание',
  'наименование оэ',
  'наименование ор',
  'объект',
]

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function findColumnIndex(headers: string[], candidates: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    if (candidates.includes(headers[i])) return i
  }
  for (let i = 0; i < headers.length; i++) {
    if (candidates.some((c) => headers[i].includes(c))) return i
  }
  return -1
}

export interface ParseResult {
  items: CatalogItem[]
  duplicateCodes: string[]
}

export function parseCatalogFromWorkbook(data: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(data, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return { items: [], duplicateCodes: [] }

  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  })

  if (rows.length === 0) return { items: [], duplicateCodes: [] }

  const headers = (rows[0] ?? []).map(normalizeHeader)
  let codeIdx = findColumnIndex(headers, CODE_HEADERS)
  let nameIdx = findColumnIndex(headers, NAME_HEADERS)

  let startRow = 1
  if (codeIdx < 0 || nameIdx < 0) {
    codeIdx = 0
    nameIdx = Math.min(1, (rows[0]?.length ?? 1) - 1)
    startRow = 0
  }

  const items: CatalogItem[] = []
  const seen = new Map<string, number>()
  const duplicateCodes: string[] = []

  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue

    const code = String(row[codeIdx] ?? '').trim()
    const name = String(row[nameIdx] ?? '').trim()
    if (!code) continue

    const key = code.toLowerCase()
    const count = (seen.get(key) ?? 0) + 1
    seen.set(key, count)
    if (count === 2) duplicateCodes.push(code)
    if (count > 1) continue

    items.push({ code, name: name || code })
  }

  return { items, duplicateCodes }
}

export function validateMappings(mappings: Mapping[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const byOr = new Map<string, Mapping[]>()
  const byOe = new Map<string, Mapping[]>()

  for (const m of mappings) {
    if (!m.orCode) continue
    const orKey = m.orCode.toLowerCase()
    const oeKey = m.oeCode.toLowerCase()
    if (!byOr.has(orKey)) byOr.set(orKey, [])
    if (!byOe.has(oeKey)) byOe.set(oeKey, [])
    byOr.get(orKey)!.push(m)
    byOe.get(oeKey)!.push(m)
  }

  for (const [, group] of byOr) {
    if (group.length < 2) continue
    const first = group[0]
    issues.push({
      type: 'duplicate_or',
      code: first.orCode,
      name: first.orName,
      oeCodes: group.map((g) => g.oeCode),
      message: `ОР «${first.orCode}» сопоставлен с несколькими ОЭ: ${group.map((g) => g.oeCode).join(', ')}`,
    })
  }

  for (const [, group] of byOe) {
    if (group.length < 2) continue
    const first = group[0]
    issues.push({
      type: 'duplicate_oe',
      code: first.oeCode,
      name: first.oeName,
      oeCodes: group.map((g) => g.oeCode),
      message: `ОЭ «${first.oeCode}» имеет несколько сопоставлений`,
    })
  }

  return issues
}

export function buildMappings(
  oeItems: CatalogItem[],
  matchMap: Record<string, string>,
  orItems: CatalogItem[],
): Mapping[] {
  const orByCode = new Map(orItems.map((o) => [o.code.toLowerCase(), o]))
  const result: Mapping[] = []

  for (const oe of oeItems) {
    const orCode = matchMap[oe.code]
    if (!orCode) continue
    const or = orByCode.get(orCode.toLowerCase())
    if (!or) continue
    result.push({
      oeCode: oe.code,
      oeName: oe.name,
      orCode: or.code,
      orName: or.name,
    })
  }

  return result
}

export function exportMappingsToExcel(mappings: Mapping[], filename: string) {
  const rows = mappings.map((m) => ({
    'Код ОЭ': m.oeCode,
    'Наименование ОЭ': m.oeName,
    'Код ОР': m.orCode,
    'Наименование ОР': m.orName,
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)
  worksheet['!cols'] = [
    { wch: 18 },
    { wch: 45 },
    { wch: 18 },
    { wch: 45 },
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Сопоставление')
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  saveAs(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    filename,
  )
}

export function exportMappingsToJson(mappings: Mapping[], filename: string) {
  const payload = {
    exportedAt: new Date().toISOString(),
    count: mappings.length,
    mappings: mappings.map((m) => ({
      oe_code: m.oeCode,
      oe_name: m.oeName,
      or_code: m.orCode,
      or_name: m.orName,
    })),
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  saveAs(blob, filename)
}

export function filterItems(items: CatalogItem[], query: string): CatalogItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter(
    (item) =>
      item.code.toLowerCase().includes(q) || item.name.toLowerCase().includes(q),
  )
}
