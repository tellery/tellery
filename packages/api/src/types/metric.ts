const dataTypes = ['string', 'integer', 'float', 'datetime'] as const
type DataType = typeof dataTypes[number]

const aggregations = {
  string: ['count', 'countDistinct'],
  integer: ['sum', 'avg', 'min', 'max', 'median', 'std'],
  float: ['sum', 'avg', 'min', 'max', 'median', 'std'],
  datetime: ['count', 'countDistinct'],
} as const

type Aggregation = typeof aggregations[DataType][number]

const bucketizations = {
  string: [],
  integer: [],
  float: [],
  datetime: ['byYear', 'byMonth', 'byDate', 'byWeek'],
} as const

type Bucketization = typeof bucketizations[DataType][number]

type Field = {
  name: string
  type: DataType
}

type Measurement = {
  name: string
  type: DataType
  deprecated?: boolean
} & (
  | {
      fieldName: string
      aggregation?: Aggregation
    }
  | {
      rawSql: string
    }
)

type Dimension = {
  type: DataType
} & (
  | {
      fieldName: string
      bucketization?: Bucketization
    }
  | {
      rawSql: string
    }
)

export { aggregations, bucketizations, dataTypes, Field, Measurement, Dimension }
