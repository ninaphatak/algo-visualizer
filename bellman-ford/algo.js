/* ============================================
   CS 141 — Bellman-Ford Algorithm (Pure Logic)
   ============================================ */

window.AlgoVis = window.AlgoVis || {};

/**
 * Run Bellman-Ford algorithm on a graph.
 * @param {number} n - number of vertices
 * @param {Array} directedEdges - array of [u, v, w] directed edges
 *        (caller must double undirected edges before calling)
 * @param {number} source - source vertex index
 * @returns {Array} events for step-by-step playback
 */
AlgoVis.runBellmanFord = function (n, directedEdges, source) {
  var INF = Infinity;
  var dist = Array(n).fill(INF);
  var parent = Array(n).fill(-1);
  dist[source] = 0;

  var events = [];
  var roundHistory = []; // dist[] snapshot at end of each completed round

  events.push({
    type: 'init',
    dist: [].concat(dist),
    source: source
  });

  // Main relaxation: n-1 rounds
  for (var k = 1; k <= n - 1; k++) {
    var anyUpdate = false;

    events.push({
      type: 'round-start',
      round: k
    });

    for (var i = 0; i < directedEdges.length; i++) {
      var e = directedEdges[i];
      var u = e[0], v = e[1], w = e[2];
      var oldDist = dist[v];
      var newDist = dist[u] + w;

      if (dist[u] !== INF && newDist < oldDist) {
        dist[v] = newDist;
        parent[v] = u;
        anyUpdate = true;

        events.push({
          type: 'relax',
          from: u,
          to: v,
          weight: w,
          oldDist: oldDist,
          newDist: newDist,
          success: true,
          distSnapshot: [].concat(dist),
          parentSnapshot: [].concat(parent)
        });
      } else {
        events.push({
          type: 'relax-fail',
          from: u,
          to: v,
          weight: w,
          oldDist: oldDist,
          newDist: dist[u] === INF ? INF : newDist,
          success: false,
          distSnapshot: [].concat(dist),
          parentSnapshot: [].concat(parent)
        });
      }
    }

    roundHistory.push([].concat(dist));

    events.push({
      type: 'round-end',
      round: k,
      anyUpdate: anyUpdate,
      distSnapshot: [].concat(dist),
      parentSnapshot: [].concat(parent)
    });

    // Early termination if no updates
    if (!anyUpdate) break;
  }

  // Negative cycle detection: one more pass
  var negativeCycle = false;
  for (var i = 0; i < directedEdges.length; i++) {
    var e = directedEdges[i];
    var u = e[0], v = e[1], w = e[2];
    var improved = dist[u] !== INF && dist[u] + w < dist[v];
    if (improved) negativeCycle = true;

    events.push({
      type: 'negative-cycle-check',
      edge: { from: u, to: v, w: w },
      improved: improved
    });
  }

  events.push({
    type: 'done',
    dist: [].concat(dist),
    parent: [].concat(parent),
    negativeCycle: negativeCycle,
    roundHistory: roundHistory
  });

  return events;
};
