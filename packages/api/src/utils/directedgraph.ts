import _ from 'lodash'

export class DirectedGraph<T, K = string> {
  private storage: Map<K, { node: T; edges: K[] }> = new Map()

  hasNode(key: K): boolean {
    return this.storage.has(key)
  }

  getNode(key: K): T {
    const node = this.storage.get(key)?.node
    if (node === undefined) {
      throw new Error(`Node of ${key} has not been initialized yet!`)
    }
    return node
  }

  getEdges(key: K): K[] {
    const edges = this.storage.get(key)?.edges
    if (!edges) {
      throw new Error(`Node of ${key} has not been initialized yet!`)
    }
    return edges
  }

  addNode(key: K, node: T): void {
    if (!this.storage.has(key)) {
      this.storage.set(key, { node, edges: [] })
    }
  }

  addEdge(key1: K, key2: K): void {
    this.getEdges(key1).push(key2)
  }

  toJSON(): { nodes: (T & { id: K })[]; edges: { source: K; target: K }[] } {
    return {
      nodes: Array.from(this.storage).map(([k, v]) => ({ ...v.node, id: k })),
      edges: Array.from(this.storage).flatMap(([k, v]) =>
        _(v.edges)
          .uniq()
          .map((neighbor) => ({
            source: k,
            target: neighbor,
          }))
          .value(),
      ),
    }
  }

  printAdjacentList(): void {
    Array.from(this.storage).forEach(([k, v]) => {
      console.log(`${k} -> ${_.uniq(v.edges).join(', ')}`)
    })
  }

  isCyclic(key: K, visited: Set<K> = new Set(), recStack: Set<K> = new Set()): boolean {
    visited.add(key)
    recStack.add(key)

    const shouldExit = _(this.getEdges(key))
      .uniq()
      .some((neighbor) => {
        if (!visited.has(neighbor)) {
          // dfs search
          if (this.isCyclic(neighbor, visited, recStack)) {
            return true
          }
        } else if (recStack.has(neighbor)) {
          // if has been visited and appears in recStack => backward edge
          return true
        }
        return false
      })

    if (!shouldExit) {
      recStack.delete(key)
    }
    return shouldExit
  }

  getKeys(): IterableIterator<K> {
    return this.storage.keys()
  }
}

export class WeightedDirectedGraph<T, K = string, W = number> {
  private storage: Map<K, { node: T; edges: { target: K; weight: W }[] }> = new Map()

  hasNode(key: K): boolean {
    return this.storage.has(key)
  }

  getNode(key: K): T {
    const node = this.storage.get(key)?.node
    if (node === undefined) {
      throw new Error(`Node of ${key} has not been initialized yet!`)
    }
    return node
  }

  getEdges(key: K): { target: K; weight: W }[] {
    const edges = this.storage.get(key)?.edges
    if (!edges) {
      throw new Error(`Node of ${key} has not been initialized yet!`)
    }
    return edges
  }

  addNode(key: K, node: T): void {
    if (!this.storage.has(key)) {
      this.storage.set(key, { node, edges: [] })
    }
  }

  addEdge(key1: K, key2: K, weight: W): void {
    this.getEdges(key1).push({
      target: key2,
      weight,
    })
  }

  toJSON(): { nodes: (T & { id: K })[]; edges: { source: K; target: K; weight: W }[] } {
    return {
      nodes: Array.from(this.storage).map(([k, v]) => ({ ...v.node, id: k })),
      edges: Array.from(this.storage).flatMap(([k, v]) =>
        _(v.edges)
          .uniqBy(({ target, weight }) => `${target}-${weight}`)
          .map(({ target, weight }) => ({
            source: k,
            target,
            weight,
          }))
          .value(),
      ),
    }
  }

  printAdjacentList(): void {
    Array.from(this.storage).forEach(([k, v]) => {
      console.log(
        `${k} -> ${_.uniqBy(v.edges, ({ target, weight }) => `${target}-${weight}`).join(', ')}`,
      )
    })
  }

  isCyclic(key: K, visited: Set<K> = new Set(), recStack: Set<K> = new Set()): boolean {
    visited.add(key)
    recStack.add(key)

    const shouldExit = _(this.getEdges(key))
      .uniqBy(({ target, weight }) => `${target}-${weight}`)
      .some(({ target: neighbor }) => {
        if (!visited.has(neighbor)) {
          // dfs search
          if (this.isCyclic(neighbor, visited, recStack)) {
            return true
          }
        } else if (recStack.has(neighbor)) {
          // if has been visited and appears in recStack => backward edge
          return true
        }
        return false
      })

    if (!shouldExit) {
      recStack.delete(key)
    }
    return shouldExit
  }

  getKeys(): IterableIterator<K> {
    return this.storage.keys()
  }
}
