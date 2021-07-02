import test from 'ava'

import { DirectedGraph } from '../../src/utils/directedgraph'

/**
 * A  ──────────────>  B ───────────────> C
 * │                                      ^
 * │                                      │
 * └──────────────────────────────────────┘
 */
test('regular graph', (t) => {
  const g = new DirectedGraph<number, string>()
  g.addNode('a', 1)
  g.addNode('b', 2)
  g.addNode('c', 3)
  g.addEdge('a', 'b')
  g.addEdge('b', 'c')
  g.addEdge('a', 'c')

  t.truthy(g.hasNode('a'))
  t.deepEqual(g.getNode('b'), 2)

  t.deepEqual(g.getEdges('a'), ['b', 'c'])
  t.deepEqual(g.getEdges('c'), [])
  t.falsy(g.isCyclic('a'))
})

/**
 * A  ──────────────>  B ───────────────> C
 * ^                                      │
 * │                                      │
 * └──────────────────────────────────────┘
 */
test('cyclic graph', (t) => {
  const g = new DirectedGraph<number, string>()
  g.addNode('a', 1)
  g.addNode('b', 2)
  g.addNode('c', 3)
  g.addEdge('a', 'b')
  g.addEdge('b', 'c')
  g.addEdge('c', 'a')

  t.truthy(g.hasNode('a'))
  t.deepEqual(g.getNode('b'), 2)

  t.deepEqual(g.getEdges('a'), ['b'])
  t.deepEqual(g.getEdges('c'), ['a'])
  t.truthy(g.isCyclic('a'))
})
