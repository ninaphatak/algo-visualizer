/* ============================================
   CS 141 — Prim's Algorithm (Pure Logic)
   ============================================ */

window.AlgoVis = window.AlgoVis || {};

/**
 * Run Prim's algorithm on a graph.
 * CRITICAL: Prim uses w(u,v) < key[v], NOT key[u] + w(u,v).
 *
 * @param {number} n - number of vertices
 * @param {Array} adj - adjacency list from AlgoVis.buildAdj
 * @param {number} source - source vertex index
 * @returns {Array} events for step-by-step playback
 */
AlgoVis.runPrim = function (n, adj, source) {
  var key = [];
  var parentArr = [];
  var finalized = [];
  var events = [];

  for (var i = 0; i < n; i++) {
    key[i] = Infinity;
    parentArr[i] = -1;
    finalized[i] = false;
  }
  key[source] = 0;

  events.push({
    type: 'init',
    source: source,
    keySnapshot: key.slice(),
    parentSnapshot: parentArr.slice()
  });

  for (var round = 0; round < n; round++) {
    // Extract vertex with minimum key not yet finalized
    var u = -1;
    for (var j = 0; j < n; j++) {
      if (!finalized[j] && (u === -1 || key[j] < key[u])) {
        u = j;
      }
    }
    if (u === -1 || key[u] === Infinity) break;

    finalized[u] = true;

    events.push({
      type: 'extract',
      vertex: u,
      key: key[u],
      keySnapshot: key.slice(),
      parentSnapshot: parentArr.slice(),
      finalizedSnapshot: finalized.slice()
    });

    // Relax neighbors using w(u,v) < key[v] (NOT key[u] + w(u,v))
    for (var k = 0; k < adj[u].length; k++) {
      var edge = adj[u][k];
      var v = edge.v;
      var w = edge.w;

      if (finalized[v]) continue;

      events.push({
        type: 'consider-edge',
        from: u,
        to: v,
        weight: w
      });

      var oldKey = key[v];

      if (w < key[v]) {
        // Update key — THIS is the key difference from Dijkstra
        key[v] = w;
        parentArr[v] = u;

        events.push({
          type: 'relax',
          from: u,
          to: v,
          weight: w,
          oldKey: oldKey,
          newKey: w,
          keySnapshot: key.slice(),
          parentSnapshot: parentArr.slice()
        });
      } else {
        events.push({
          type: 'relax-skip',
          from: u,
          to: v,
          weight: w,
          oldKey: oldKey,
          keySnapshot: key.slice(),
          parentSnapshot: parentArr.slice()
        });
      }
    }
  }

  // Build MST edges from parent array
  var mstEdges = [];
  var totalWeight = 0;
  for (var m = 0; m < n; m++) {
    if (parentArr[m] !== -1) {
      mstEdges.push({ u: parentArr[m], v: m, w: key[m] });
      totalWeight += key[m];
    }
  }

  events.push({
    type: 'done',
    mstEdges: mstEdges,
    totalWeight: totalWeight,
    parent: parentArr.slice()
  });

  return events;
};
