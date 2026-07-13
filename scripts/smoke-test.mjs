import * as XLSX from 'xlsx'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function parseCatalog(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false,
  })
  const headers = rows[0].map(normalizeHeader)
  const codeIdx = headers.indexOf('код')
  const nameIdx = headers.indexOf('наименование')
  const items = []
  const seen = new Map()
  const duplicateCodes = []
  for (let i = 1; i < rows.length; i++) {
    const code = String(rows[i][codeIdx] ?? '').trim()
    const name = String(rows[i][nameIdx] ?? '').trim()
    if (!code) continue
    const key = code.toLowerCase()
    const count = (seen.get(key) ?? 0) + 1
    seen.set(key, count)
    if (count === 2) duplicateCodes.push(code)
    if (count > 1) continue
    items.push({ code, name })
  }
  return { items, duplicateCodes }
}

function validateMappings(mappings) {
  const byOr = new Map()
  for (const m of mappings) {
    const key = m.orCode.toLowerCase()
    if (!byOr.has(key)) byOr.set(key, [])
    byOr.get(key).push(m)
  }
  return [...byOr.values()].filter((g) => g.length > 1)
}

const oe = parseCatalog(readFileSync(join(root, 'sample-data/oe_sample.xlsx')))
const or = parseCatalog(readFileSync(join(root, 'sample-data/or_sample.xlsx')))

assert(oe.items.length === 20, `expected 20 OE, got ${oe.items.length}`)
assert(or.items.length === 40, `expected 40 OR unique, got ${or.items.length}`)
assert(or.duplicateCodes.length === 1, 'expected 1 duplicate OR code in sample')

const dups = validateMappings([
  {
    oeCode: 'ОЭ-0001',
    oeName: 'A',
    orCode: 'ОР-0005',
    orName: 'X',
  },
  {
    oeCode: 'ОЭ-0002',
    oeName: 'B',
    orCode: 'ОР-0005',
    orName: 'X',
  },
])
assert(dups.length === 1, 'expected duplicate OR mapping detection')

console.log('All checks passed')
