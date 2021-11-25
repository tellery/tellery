import {
  parse,
  tokenize,
  Node,
  WithAlias,
  // BasicNode,
  // JoinNode,
  // UnionNode,
  isBasic,
  isJoin,
  isUnion,
} from 'monaco-sql-parser'
import { buildGraph } from '../core/translator'
import { WeightedDirectedGraph } from './directedgraph'
import { initTokenizer } from './init-tokenizer'

// //flatten table structure, wiping off transformations
// function squeezeNode(curr: Node | string): Node | string {
//   if (curr instanceof Node) {
//     if (isBasic(curr)) {
//       //stripping off basic
//       return squeezeNode(curr.from.val)
//     } else if (isUnion(curr)) {
//       curr.unions = curr.unions.map(squeezeNodeWithAlias)
//     } else if (isJoin(curr)) {
//       curr.joins = curr.joins.map(squeezeNodeWithAlias)
//     }
//   }
//   return curr
// }

// function squeezeNodeWithAlias(curr: WithAlias<Node | string>): WithAlias<Node | string> {
//   return WithAlias.of(squeezeNode(curr.val), curr.alias, curr.blockId)
// }

// replace transclusion part to its AST
export function traverseTree(node: Node, astMap: Map<string, Node | string>): Node {
  function replaceNode(curr: WithAlias<Node | string>): WithAlias<Node | string> {
    const currVal = curr.val
    if (currVal instanceof Node) {
      return WithAlias.of(traverseTree(currVal, astMap), curr.alias)
    } else {
      if (currVal.startsWith('{{')) {
        const blockId = currVal.substr(2, 21)
        const newNode = astMap.get(blockId)
        if (!newNode) {
          throw Error(`unknown transclusion ${currVal}`)
        }
        if (newNode instanceof Node) newNode.blockId = blockId
        return WithAlias.of(newNode, curr.alias)
      }
      return curr
    }
  }

  if (isBasic(node)) {
    node.from = replaceNode(node.from)
  } else if (isJoin(node)) {
    node.joins = node.joins.map(replaceNode)
  } else if (isUnion(node)) {
    node.unions = node.unions.map(replaceNode)
  } else {
    throw Error('Unexpected Node Type')
  }
  return node
}

// export async function analyzeSql(sql: string): Promise<Node | string> {
export async function analyzeSql(sql: string): Promise<Node> {
  // first build sql graph
  initTokenizer()
  const graph = await buildGraph(sql, { withRaw: true })

  // build ast for each node in the graph
  const astMap = new Map<string, Node>()
  // const astMap = new Map<string, Node | string>()
  Array.from(graph.getKeys()).forEach((k) => {
    const { raw } = graph.getNode(k)
    try {
      const tree = parse(tokenize(raw ?? '', 'sql', false))
      astMap.set(k, tree)
    } catch (err: unknown) {
      console.error(err)
      throw err
    }
    // astMap.set(k, squeezeNode(tree))
  })

  // traverse the ast of the root of the graph, replace each of the transclusion node by the corresponding ast
  const rootNode = astMap.get('root')!
  return traverseTree(rootNode, astMap)
  // if (rootNode instanceof Node) {
  //   return traverseTree(rootNode, astMap)
  // } else {
  //   return rootNode
  // }
}

type NNode = {
  type: 'transclusion' | 'table'
  id: string
}

enum EdgeType {
  DIRECT = 'direct',
  JOIN = 'join',
  UNION = 'union',
}

// Only two types of node would be considered: transclusion and raw
function buildConnection(
  node: Node | string,
  graph: WeightedDirectedGraph<NNode, string, EdgeType>,
  type: EdgeType = EdgeType.DIRECT,
  parentKey?: string,
) {
  if (node instanceof Node) {
    let pKey = parentKey
    if (node.blockId) {
      if (!graph.hasNode(node.blockId)) {
        graph.addNode(node.blockId, { type: 'transclusion', id: node.blockId })
      }
      if (parentKey) {
        graph.addEdge(parentKey, node.blockId, type)
      }
      pKey = node.blockId
    }
    if (isBasic(node)) {
      buildConnection(node.from.val, graph, type, pKey)
    } else if (isJoin(node)) {
      node.joins.forEach((j) => buildConnection(j.val, graph, EdgeType.JOIN, pKey))
    } else if (isUnion(node)) {
      node.unions.forEach((u) => buildConnection(u.val, graph, EdgeType.UNION, pKey))
    }
  } else {
    // reached leaf, connect it with parent
    graph.addNode(node, { type: 'table', id: node })
    if (parentKey) {
      graph.addEdge(parentKey, node, type)
    }
  }
}

export function convertToGraph(root: Node): WeightedDirectedGraph<NNode, string, EdgeType> {
  const graph = new WeightedDirectedGraph<NNode, string, EdgeType>()
  buildConnection(root, graph)
  return graph
}
