/* ============================================
   CS 141 — Bellman-Ford Algorithm (Pure Logic)
   ============================================ */

window.AlgoVis = window.AlgoVis || {};

/**
 * Run Bellman-Ford on a DIRECTED graph.
 * @param {number} n - number of vertices
 * @param {Array} edges - array of [u, v, w] directed edges
 * @param {number} source - source vertex index
 * @returns {Array} events for step-by-step playback
 */
AlgoVis.runBellmanFord = function (n, edges, source) {
  var INF = Infinity;
  var dist = Array(n).fill(INF);
  var parent = Array(n).fill(-1);
  dist[source] = 0;

  var events = [];

  // Initial state — include the full DP table row for round 0
  events.push({
    type: 'init',
    distSnapshot: [].concat(dist),
    parentSnapshot: [].concat(parent),
    source: source
  });

  // Main relaxation: n-1 rounds
  for (var k = 1; k <= n - 1; k++) {
    var anyUpdate = false;

    events.push({
      type: 'round-start',
      round: k,
      distSnapshot: [].concat(dist),
      parentSnapshot: [].concat(parent)
    });

    for (var i = 0; i < edges.length; i++) {
      var e = edges[i];
      var u = e[0], v = e[1], w = e[2];
      var oldDist = dist[v];
      var newDist = dist[u] === INF ? INF : dist[u] + w;
      var success = newDist < oldDist;

      if (success) {
        dist[v] = newDist;
        parent[v] = u;
        anyUpdate = true;
      }

      events.push({
        type: success ? 'relax' : 'relax-fail',
        from: u,
        to: v,
        weight: w,
        edgeIndex: i,
        round: k,
        oldDist: oldDist,
        newDist: newDist,
        success: success,
        distSnapshot: [].concat(dist),
        parentSnapshot: [].concat(parent)
      });
    }

    events.push({
      type: 'round-end',
      round: k,
      anyUpdate: anyUpdate,
      distSnapshot: [].concat(dist),
      parentSnapshot: [].concat(parent)
    });

    if (!anyUpdate) break;
  }

  // Negative cycle detection
  var negativeCycle = false;
  for (var i = 0; i < edges.length; i++) {
    var e = edges[i];
    var u = e[0], v = e[1], w = e[2];
    var improved = dist[u] !== INF && dist[u] + w < dist[v];
    if (improved) negativeCycle = true;

    events.push({
      type: 'negative-cycle-check',
      from: u, to: v, weight: w,
      edgeIndex: i,
      improved: improved,
      distSnapshot: [].concat(dist),
      parentSnapshot: [].concat(parent)
    });
  }

  events.push({
    type: 'done',
    distSnapshot: [].concat(dist),
    parentSnapshot: [].concat(parent),
    negativeCycle: negativeCycle
  });

  return events;
};
