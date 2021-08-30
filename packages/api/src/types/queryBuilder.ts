type DataType = string
type FunctionName = string
type QueryBuilderTranslation = Map<DataType, Map<string, FunctionName>>

type QueryBuilderSpec = {
  // single char
  identifier: string
  // single char
  stringLiteral: string
  aggregation: QueryBuilderTranslation
  bucketization: QueryBuilderTranslation
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

type SmartQueryExecution = {
  queryBuilderId: string
  metricIds: string[]
  dimensions: Dimension[]
  // filters: Filter[]
}

export {
  QueryBuilderSpec,
  SelectBuilder,
  QueryBuilderTranslation,
  Field,
  Metric,
  Dimension,
  SmartQueryExecution,
}
