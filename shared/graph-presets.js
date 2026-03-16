/* ============================================
   CS 141 Algorithm Visualizer — Graph Presets
   ============================================ */

window.AlgoVis = window.AlgoVis || {};

AlgoVis.GRAPH_PRESETS = [
  {
    name: 'UCR Map',
    n: 8,
    labels: ['Bourns', 'Bookstore', 'Pierce', 'HUB', 'Bell Tower', 'Greenhouse', 'Winston', 'Library'],
    edges: [
      [0, 1, 3], [0, 4, 9], [0, 5, 14], [0, 6, 1],
      [1, 2, 4], [1, 4, 5],
      [2, 3, 2],
      [3, 4, 6], [3, 5, 8], [3, 7, 7],
      [5, 6, 17], [5, 7, 15]
    ],
    source: 6,
    // Positions for visualization (approximate campus layout)
    positions: [
      { x: 1, y: 2 },    // 0 Bourns
      { x: 3, y: 1 },    // 1 Bookstore
      { x: 5, y: 1 },    // 2 Pierce
      { x: 5, y: 3 },    // 3 HUB
      { x: 3, y: 3 },    // 4 Bell Tower
      { x: 1, y: 4 },    // 5 Greenhouse
      { x: 0, y: 1 },    // 6 Winston
      { x: 5, y: 5 }     // 7 Library
    ]
  },
  {
    name: 'Simple',
    n: 5,
    labels: ['A', 'B', 'C', 'D', 'E'],
    edges: [
      [0, 1, 4], [0, 4, 1], [1, 2, 2], [1, 3, 5],
      [2, 3, 1], [3, 4, 3], [0, 3, 7]
    ],
    source: 0,
    positions: [
      { x: 0, y: 0 },    // A
      { x: 2, y: 0 },    // B
      { x: 3, y: 1.5 },  // C
      { x: 2, y: 3 },    // D
      { x: 0, y: 3 }     // E
    ]
  },
  {
    name: 'Dense',
    n: 6,
    labels: ['S', 'A', 'B', 'C', 'D', 'T'],
    edges: [
      [0, 1, 7], [0, 2, 9], [0, 5, 14],
      [1, 2, 10], [1, 3, 15],
      [2, 4, 11], [2, 3, 2],
      [3, 5, 6], [4, 5, 9]
    ],
    source: 0,
    positions: [
      { x: 0, y: 1.5 },  // S
      { x: 1.5, y: 0 },  // A
      { x: 1.5, y: 3 },  // B
      { x: 3, y: 0 },    // C
      { x: 3, y: 3 },    // D
      { x: 4.5, y: 1.5 } // T
    ]
  }
];

/**
 * Build adjacency list from edges (BOTH directions).
 * Returns: array of arrays, adj[u] = [{ v, w }, ...]
 */
AlgoVis.buildAdj = function (n, edges) {
  var adj = [];
  for (var i = 0; i < n; i++) adj.push([]);

  edges.forEach(function (e) {
    var u = e[0], v = e[1], w = e[2];
    adj[u].push({ v: v, w: w });
    adj[v].push({ v: u, w: w });
  });

  return adj;
};

/**
 * Negative edges for testing Dijkstra failure / Bellman-Ford.
 * Maps preset name to array of [u, v, w] negative edges to add.
 */
AlgoVis.NEGATIVE_EDGES = {
  'UCR Map': [[2, 3, -5]],
  'Simple': [[2, 3, -4]],
  'Dense': [[2, 3, -8]]
};
