/* ============================================
   CS 141 Algorithm Visualizer — Floyd-Warshall
   ============================================ */

window.AlgoVis = window.AlgoVis || {};

AlgoVis.runFloydWarshall = function (n, edges) {
  var INF = Infinity;
  var events = [];

  // Initialize distance matrix
  var d = [];
  for (var i = 0; i < n; i++) {
    d[i] = [];
    for (var j = 0; j < n; j++) {
      d[i][j] = INF;
    }
    d[i][i] = 0;
  }

  // Fill in edge weights (undirected: both directions)
  for (var e = 0; e < edges.length; e++) {
    var u = edges[e][0], v = edges[e][1], w = edges[e][2];
    d[u][v] = w;
    d[v][u] = w;
  }

  function copyMatrix() {
    var copy = [];
    for (var r = 0; r < n; r++) {
      copy[r] = d[r].slice();
    }
    return copy;
  }

  events.push({ type: 'init', matrix: copyMatrix() });

  // Floyd-Warshall: k OUTERMOST
  for (var k = 0; k < n; k++) {
    events.push({ type: 'phase-start', k: k });

    for (var i = 0; i < n; i++) {
      for (var j = 0; j < n; j++) {
        var throughK = d[i][k] + d[k][j];
        var oldVal = d[i][j];
        var improved = throughK < oldVal;

        if (improved) {
          d[i][j] = throughK;
        }

        events.push({
          type: 'update',
          i: i,
          j: j,
          k: k,
          oldVal: oldVal,
          newVal: d[i][j],
          throughK: throughK,
          improved: improved,
          matrix: copyMatrix()
        });
      }
    }

    events.push({ type: 'phase-end', k: k, matrix: copyMatrix() });
  }

  events.push({ type: 'done', matrix: copyMatrix() });

  return events;
};
