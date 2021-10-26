type DataType = string
type FunctionName = string
type QueryBuilderTranslation = Map<DataType, Map<FunctionName, string>>

type QueryBuilderSpec = {
  // single char
  identifier: string
  // single char
  stringLiteral: string
  aggregation: QueryBuilderTranslation
  bucketization: QueryBuilderTranslation
  typeConversion: Map<DataType, string>
}

type Field = {
  name: string
  type: DataType
}

type SelectBuilder = {
  name: string
} & (
  | {
      fieldName: string
      fieldType: DataType
      func?: string
      args?: string[]
    }
  | {
      rawSql: string
    }
)

type Metric = SelectBuilder & {
  deprecated?: boolean
}

type Dimension = SelectBuilder

type FilterBuilder =
  | {
      operator: 'and' | 'or'
      operands: FilterBuilder[]
    }
  | {
      fieldName: string
      fieldType: DataType
      func: string
      args: string[]
    }

enum Filter {
  EQ = 'EQ',
  NE = 'NE',
  LT = 'LT',
  LTE = 'LTE',
  GT = 'GT',
  GTE = 'GTE',
  IN = 'IN',
  CONTAINS = 'CONTAINS',
  IS_NULL = 'IS_NULL',
  IS_NOT_NULL = 'IS_NOT_NULL',
  IS_TRUE = 'IS_TRUE',
  IS_FALSE = 'IS_FALSE',
  IS_BETWEEN = 'IS_BETWEEN',
}

const filterFunctions = new Map([
  [Filter.EQ, '? = ?'],
  [Filter.NE, '? != ?'],
  [Filter.LT, '? < ?'],
  [Filter.LTE, '? <= ?'],
  [Filter.GT, '? > ?'],
  [Filter.GTE, '? >= ?'],
  [Filter.IN, '? IN (...?)'],
  [Filter.CONTAINS, '? LIKE %?%'],
  [Filter.IS_NULL, '? IS NULL'],
  [Filter.IS_NOT_NULL, '? IS NOT NULL'],
  [Filter.IS_TRUE, '? IS TRUE'],
  [Filter.IS_FALSE, '? IS FALSE'],
  [Filter.IS_BETWEEN, '? BETWEEN ? AND ?'],
])

const typeToFilter = {
  'TINYINT,SMALLINT,INTEGER,BIGINT': [
    Filter.EQ,
    Filter.NE,
    Filter.LT,
    Filter.LTE,
    Filter.GT,
    Filter.GTE,
    Filter.IS_NULL,
    Filter.IS_NOT_NULL,
    Filter.IS_BETWEEN,
    Filter.IN,
  ],
  'FLOAT,REAL,DOUBLE,NUMERIC,DECIMAL': [
    Filter.EQ,
    Filter.NE,
    Filter.LT,
    Filter.LTE,
    Filter.GT,
    Filter.GTE,
    Filter.IS_NULL,
    Filter.IS_NOT_NULL,
    Filter.IS_BETWEEN,
  ],
  'CHAR,VARCHAR,LONGVARCHAR': [
    Filter.EQ,
    Filter.NE,
    Filter.CONTAINS,
    Filter.IS_NULL,
    Filter.IS_NOT_NULL,
    Filter.IN,
  ],
  'DATE,TIME,TIMESTAMP': [Filter.LTE, Filter.GTE, Filter.IS_BETWEEN],
  BOOLEAN: [Filter.IS_TRUE, Filter.IS_FALSE],
}

const filterSpec: QueryBuilderTranslation = new Map(
  Object.entries(typeToFilter).flatMap(([k, v]) => {
    const vMap = new Map(
      v.map((filterName) => [filterName as string, filterFunctions.get(filterName)!]),
    )
    return k.split(',').map((subKey: string) => [subKey, vMap])
  }),
)

type SmartQueryExecution = {
  queryBuilderId: string
  metricIds: string[]
  dimensions: Dimension[]
  filters?: FilterBuilder
}

export {
  filterSpec,
  QueryBuilderSpec,
  SelectBuilder,
  FilterBuilder,
  QueryBuilderTranslation,
  Field,
  Metric,
  Dimension,
  SmartQueryExecution,
}
