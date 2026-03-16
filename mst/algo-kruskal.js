/* ============================================
   CS 141 — Kruskal's Algorithm (Pure Logic)
   ============================================ */

window.AlgoVis = window.AlgoVis || {};

/**
 * Run Kruskal's algorithm on a graph.
 * @param {number} n - number of vertices
 * @param {Array} edges - array of [u, v, w]
 * @returns {Array} events for step-by-step playback
 */
AlgoVis.runKruskal = function (n, edges) {
  var events = [];

  // --- Union-Find ---
  var parent = [];
  var rank = [];

  function makeSet(v) {
    parent[v] = v;
    rank[v] = 0;
  }

  function find(v) {
    if (parent[v] !== v) {
      parent[v] = find(parent[v]); // path compression
    }
    return parent[v];
  }

  function union(a, b) {
    var ra = find(a);
    var rb = find(b);
    if (ra === rb) return;
    // union by rank
    if (rank[ra] < rank[rb]) {
      parent[ra] = rb;
    } else if (rank[ra] > rank[rb]) {
      parent[rb] = ra;
    } else {
      parent[rb] = ra;
      rank[ra]++;
    }
  }

  function getComponents() {
    var comp = [];
    for (var i = 0; i < n; i++) {
      comp.push(find(i));
    }
    return comp;
  }

  // Initialize union-find
  for (var i = 0; i < n; i++) {
    makeSet(i);
  }

  // Sort edges by weight
  var sortedEdges = edges.map(function (e) {
    return { u: e[0], v: e[1], w: e[2] };
  });
  sortedEdges.sort(function (a, b) { return a.w - b.w; });

  events.push({
    type: 'init',
    edges: sortedEdges.slice()
  });

  events.push({
    type: 'sort',
    sortedEdges: sortedEdges.slice()
  });

  var mstEdges = [];
  var mstWeight = 0;

  for (var idx = 0; idx < sortedEdges.length; idx++) {
    var edge = sortedEdges[idx];

    events.push({
      type: 'consider-edge',
      edge: { u: edge.u, v: edge.v, w: edge.w },
      index: idx
    });

    if (find(edge.u) !== find(edge.v)) {
      // Different components — accept
      union(edge.u, edge.v);
      mstEdges.push({ u: edge.u, v: edge.v, w: edge.w });
      mstWeight += edge.w;

      events.push({
        type: 'accept-edge',
        edge: { u: edge.u, v: edge.v, w: edge.w },
        components: getComponents(),
        mstWeight: mstWeight,
        mstEdges: mstEdges.slice()
      });
    } else {
      // Same component — reject (would create cycle)
      events.push({
        type: 'reject-edge',
        edge: { u: edge.u, v: edge.v, w: edge.w },
        reason: 'same component'
      });
    }
  }

  events.push({
    type: 'done',
    mstEdges: mstEdges.slice(),
    totalWeight: mstWeight,
    components: getComponents()
  });

  return events;
};
