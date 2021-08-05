type DbtMetadata = {
  name: string
  description: string
  relationName: string
  rawSql?: string
  compiledSql: string
  type: 'unspecified' | 'source' | 'model'
  materialized: 'unknown' | 'view' | 'table' | 'incremental' | 'ephemeral'
  sourceTable?: string
}

type ExportedBlockMetadata = {
  name: string
  sql: string
}

export { DbtMetadata, ExportedBlockMetadata }