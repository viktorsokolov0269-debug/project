export interface CatalogItem {
  code: string
  name: string
}

export interface Mapping {
  oeCode: string
  oeName: string
  orCode: string
  orName: string
}

export type MatchFilter = 'all' | 'matched' | 'unmatched'

export interface ValidationIssue {
  type: 'duplicate_or' | 'duplicate_oe'
  code: string
  name: string
  oeCodes: string[]
  message: string
}
