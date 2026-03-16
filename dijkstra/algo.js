/* ============================================
   CS 141 — Dijkstra's Algorithm (Pure Logic)
   ============================================ */

window.AlgoVis = window.AlgoVis || {};

/**
 * Run Dijkstra's algorithm on a graph.
 * @param {number} n - number of vertices
 * @param {Array} adj - adjacency list from AlgoVis.buildAdj (adj[u] = [{v, w}, ...])
 * @param {number} source - source vertex index
 * @returns {Array} events for step-by-step playback
 */
AlgoVis.runDijkstra = function (n, adj, source) {
  var dist = Array(n).fill(Infinity);
  var parent = Array(n).fill(-1);
  var finalized = Array(n).fill(false);
  dist[source] = 0;
  var events = [];

  events.push({
    type: 'init',
    dist: [].concat(dist),
    source: source,
    distSnapshot: [].concat(dist),
    finalizedSnapshot: [].concat(finalized),
    parentSnapshot: [].concat(parent)
  });

  for (var round = 0; round < n; round++) {
    // Find the unfinalized vertex with minimum distance
    var u = -1;
    for (var i = 0; i < n; i++) {
      if (!finalized[i] && (u === -1 || dist[i] < dist[u])) u = i;
    }
    if (u === -1 || dist[u] === Infinity) break;

    finalized[u] = true;
    events.push({
      type: 'extract',
      vertex: u,
      dist: dist[u],
      distSnapshot: [].concat(dist),
      finalizedSnapshot: [].concat(finalized),
      parentSnapshot: [].concat(parent)
    });

    // Relax all neighbors of u
    for (var j = 0; j < adj[u].length; j++) {
      var edge = adj[u][j];
      var v = edge.v;
      var w = edge.w;
      var newDist = dist[u] + w;
      var oldDist = dist[v];
      var success = newDist < oldDist;

      if (success) {
        dist[v] = newDist;
        parent[v] = u;
      }

      events.push({
        type: success ? 'relax' : 'relax-skip',
        from: u,
        to: v,
        weight: w,
        newDist: newDist,
        oldDist: oldDist,
        currentDist: dist[v],
        success: success,
        distSnapshot: [].concat(dist),
        finalizedSnapshot: [].concat(finalized),
        parentSnapshot: [].concat(parent),
        negativeWarning: success && finalized[v]
      });
    }
  }

  events.push({
    type: 'done',
    dist: [].concat(dist),
    parent: [].concat(parent),
    finalized: [].concat(finalized),
    distSnapshot: [].concat(dist),
    finalizedSnapshot: [].concat(finalized),
    parentSnapshot: [].concat(parent),
    negativeWarning: events.some(function (e) { return e.negativeWarning; })
  });

  return events;
};
