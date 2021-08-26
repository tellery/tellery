type DataType = string
type FunctionName = string
type MetricTranslation = Map<DataType, Map<string, FunctionName>>

type MetricSpec = {
  // single char
  identifier: string
  // single char
  stringLiteral: string
  aggregation: MetricTranslation
  bucketization: MetricTranslation
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
      type: DataType
      func?: string
      args?: string[]
    }
  | {
      rawSql: string
    }
)

type Measurement = SelectBuilder & {
  deprecated?: boolean
}

type Dimension = SelectBuilder

type ExplorationExecution = {
  metricId: string
  measurementIds: string[]
  dimensions: Dimension[]
  // filters: Filter[]
}

export {
  MetricSpec,
  SelectBuilder,
  MetricTranslation,
  Field,
  Measurement,
  Dimension,
  ExplorationExecution,
}
