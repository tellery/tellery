import type { Type, Data, Config } from '../types'

export interface Chart<T extends Type> {
  type: T

  initializeConfig(data: Data, cache: { [TT in Type]?: Config<TT> }): Config<T>

  Configuration(props: {
    data: Data
    config: Config<T>
    onConfigChange(key: keyof Config<T>, value: Config<T>[typeof key]): void
    onConfigChange(
      key1: keyof Config<T>,
      value1: Config<T>[typeof key1],
      key2: keyof Config<T>,
      value2: Config<T>[typeof key2]
    ): void
    onConfigChange(
      key1: keyof Config<T>,
      value1: Config<T>[typeof key1],
      key2: keyof Config<T>,
      value2: Config<T>[typeof key2],
      key3: keyof Config<T>,
      value3: Config<T>[typeof key3]
    ): void
  }): JSX.Element

  Diagram(props: { dimensions: { width: number; height: number }; data: Data; config: Config<T> }): JSX.Element
}
