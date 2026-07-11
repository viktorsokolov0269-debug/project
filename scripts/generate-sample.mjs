import * as XLSX from 'xlsx'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'sample-data')
mkdirSync(outDir, { recursive: true })

function writeSheet(filename, rows) {
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Данные')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  writeFileSync(join(outDir, filename), buf)
}

const oe = Array.from({ length: 20 }, (_, i) => ({
  Код: `ОЭ-${String(i + 1).padStart(4, '0')}`,
  Наименование: `Объект эксплуатации ${i + 1}`,
}))

const or = Array.from({ length: 40 }, (_, i) => ({
  Код: `ОР-${String(i + 1).padStart(4, '0')}`,
  Наименование: `Объект ремонта ${i + 1}`,
}))

// duplicate code in OR sample
or.push({ Код: 'ОР-0001', Наименование: 'Дубликат объекта ремонта 1' })

writeSheet('oe_sample.xlsx', oe)
writeSheet('or_sample.xlsx', or)

console.log('Sample files written to sample-data/')
