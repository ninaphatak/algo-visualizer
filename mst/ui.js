/* ============================================
   CS 141 — MST Visualizer UI
   Supports Kruskal / Prim toggle
   ============================================ */

(function () {
  'use strict';

  var presets = AlgoVis.GRAPH_PRESETS;
  var canvas  = document.getElementById('graphCanvas');
  var presetBtnsContainer = document.getElementById('presetBtns');

  var currentPresetIndex = 0;
  var activeAlgo = 'kruskal'; // 'kruskal' | 'prim'
  var player = null;
  var events = [];
  var currentEdges = null;
  var currentAdj = null;

  // Track processed edges for Kruskal coloring
  var kruskalEdgeStatus = {}; // index -> 'accepted' | 'rejected'
  var kruskalCurrentIdx = -1;
  var kruskalSortedEdges = [];

  // ---- Preset buttons ----
  presets.forEach(function (p, i) {
    var btn = document.createElement('button');
    btn.className = 'preset-btn' + (i === 0 ? ' active' : '');
    btn.textContent = p.name;
    btn.addEventListener('click', function () { loadPreset(i); });
    presetBtnsContainer.appendChild(btn);
  });

  // ---- Algorithm tab switching ----
  var tabs = document.querySelectorAll('#algoTabs .tab');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var algo = tab.getAttribute('data-algo');
      if (algo === activeAlgo) return;
      activeAlgo = algo;
      tabs.forEach(function (t) {
        t.classList.toggle('active', t.getAttribute('data-algo') === algo);
      });
      switchAlgoPanels();
      rebuildAndRun();
    });
  });

  function switchAlgoPanels() {
    var isKruskal = activeAlgo === 'kruskal';
    document.getElementById('kruskalPanel').style.display = isKruskal ? '' : 'none';
    document.getElementById('primKeyPanel').style.display = isKruskal ? 'none' : '';
    document.getElementById('primPQPanel').style.display = isKruskal ? 'none' : '';
    document.getElementById('kruskalCode').style.display = isKruskal ? '' : 'none';
    document.getElementById('primCode').style.display = isKruskal ? 'none' : '';
  }

  // ---- Core logic ----
  function loadPreset(index) {
    currentPresetIndex = index;
    var btns = presetBtnsContainer.querySelectorAll('.preset-btn');
    btns.forEach(function (b, i) {
      b.classList.toggle('active', i === index);
    });
    rebuildAndRun();
  }

  function rebuildAndRun() {
    var preset = presets[currentPresetIndex];
    currentEdges = preset.edges.slice();
    currentAdj = AlgoVis.buildAdj(preset.n, currentEdges);

    // Reset Kruskal state
    kruskalEdgeStatus = {};
    kruskalCurrentIdx = -1;
    kruskalSortedEdges = [];

    if (activeAlgo === 'kruskal') {
      events = AlgoVis.runKruskal(preset.n, currentEdges);
    } else {
      events = AlgoVis.runPrim(preset.n, currentAdj, preset.source);
    }

    if (player) {
      player.pause();
    }
    player = AlgoVis.createPlayer(events, onEvent);
  }

  // ---- Event handler ----
  function onEvent(evt, index) {
    lastEvent = { evt: evt, index: index };
    var preset = presets[currentPresetIndex];

    if (activeAlgo === 'kruskal') {
      handleKruskalEvent(evt, index, preset);
    } else {
      handlePrimEvent(evt, index, preset);
    }
  }

  // ========== KRUSKAL EVENT HANDLING ==========

  function handleKruskalEvent(evt, index, preset) {
    var n = preset.n;
    var labels = preset.labels;

    // Track edge statuses up to current event
    kruskalEdgeStatus = {};
    kruskalCurrentIdx = -1;
    kruskalSortedEdges = [];

    // Replay events up to current index to rebuild state
    for (var k = 0; k <= index; k++) {
      var e = events[k];
      if (e.type === 'sort') {
        kruskalSortedEdges = e.sortedEdges;
      } else if (e.type === 'consider-edge') {
        kruskalCurrentIdx = e.index;
      } else if (e.type === 'accept-edge') {
        // Find the edge index in sorted list
        var eidx = findSortedEdgeIndex(e.edge);
        if (eidx >= 0) kruskalEdgeStatus[eidx] = 'accepted';
      } else if (e.type === 'reject-edge') {
        var ridx = findSortedEdgeIndex(e.edge);
        if (ridx >= 0) kruskalEdgeStatus[ridx] = 'rejected';
      }
    }

    // Collect MST edges up to this point
    var mstEdges = [];
    var mstWeight = 0;
    for (var m = 0; m <= index; m++) {
      if (events[m].type === 'accept-edge') {
        mstEdges.push(events[m].edge);
        mstWeight += events[m].edge.w;
      }
    }

    // --- Build render config ---
    var vertices = [];
    var edgeConfigs = [];

    // Determine which vertices are in MST
    var inMST = {};
    mstEdges.forEach(function (me) { inMST[me.u] = true; inMST[me.v] = true; });

    for (var i = 0; i < n; i++) {
      var state = 'default';
      if (inMST[i]) state = 'finalized';

      // Highlight endpoints of currently considered edge
      if (evt.type === 'consider-edge' || evt.type === 'accept-edge' || evt.type === 'reject-edge') {
        if (evt.edge && (evt.edge.u === i || evt.edge.v === i)) {
          if (evt.type === 'consider-edge') state = 'active';
        }
      }

      vertices.push({
        id: i,
        label: labels[i],
        x: preset.positions[i].x,
        y: preset.positions[i].y,
        state: state
      });
    }

    // Build edge set for graph
    var mstEdgeKeys = {};
    mstEdges.forEach(function (me) { mstEdgeKeys[edgeKey(me.u, me.v)] = true; });

    var considerKey = null;
    if (evt.type === 'consider-edge') {
      considerKey = edgeKey(evt.edge.u, evt.edge.v);
    }
    var rejectKey = null;
    if (evt.type === 'reject-edge') {
      rejectKey = edgeKey(evt.edge.u, evt.edge.v);
    }

    for (var ei = 0; ei < currentEdges.length; ei++) {
      var ce = currentEdges[ei];
      var u = ce[0], v = ce[1], w = ce[2];
      var eState = 'default';
      var ek = edgeKey(u, v);

      if (mstEdgeKeys[ek]) eState = 'mst';
      if (considerKey && ek === considerKey) eState = 'considering';
      if (rejectKey && ek === rejectKey) eState = 'rejected';

      edgeConfigs.push({ u: u, v: v, w: w, state: eState });
    }

    AlgoVis.renderGraph(canvas, {
      vertices: vertices,
      edges: edgeConfigs,
      distLabels: {}
    });

    // --- Update sidebar ---
    updateKruskalStepInfo(evt, index, labels);
    updateKruskalEdgeList(labels);
    updateKruskalPseudocode(evt);
    document.getElementById('mstWeight').textContent = mstWeight;
  }

  function findSortedEdgeIndex(edge) {
    for (var i = 0; i < kruskalSortedEdges.length; i++) {
      var se = kruskalSortedEdges[i];
      if (se.u === edge.u && se.v === edge.v && se.w === edge.w) return i;
    }
    return -1;
  }

  function updateKruskalStepInfo(evt, index, labels) {
    var el = document.getElementById('stepInfo');
    var html = '';

    if (evt.type === 'init') {
      html = '<div class="step-title">Ready</div>';
      html += 'Kruskal\'s algorithm will sort edges by weight and greedily build the MST.';
      html += ' Click <strong>Step Forward</strong> to begin.';
    } else if (evt.type === 'sort') {
      html = '<div class="step-title">Edges Sorted</div>';
      html += 'All <span class="highlight">' + evt.sortedEdges.length + '</span> edges sorted by weight in ascending order.';
    } else if (evt.type === 'consider-edge') {
      html = '<div class="step-title">Considering Edge</div>';
      html += 'Edge: <span class="highlight">' + labels[evt.edge.u] + ' &mdash; ' + labels[evt.edge.v];
      html += '</span> (weight ' + evt.edge.w + ').<br>';
      html += 'Checking if endpoints are in different components...';
    } else if (evt.type === 'accept-edge') {
      html = '<div class="step-title">Edge Accepted</div>';
      html += '<div class="relax-detail relax-success">';
      html += labels[evt.edge.u] + ' &mdash; ' + labels[evt.edge.v] + ' (w=' + evt.edge.w + ')<br>';
      html += '<strong>Different components &rarr; ADD to MST</strong><br>';
      html += 'MST weight: ' + evt.mstWeight + ' (' + evt.mstEdges.length + ' edges)';
      html += '</div>';
    } else if (evt.type === 'reject-edge') {
      html = '<div class="step-title">Edge Rejected</div>';
      html += '<div class="relax-detail relax-fail">';
      html += labels[evt.edge.u] + ' &mdash; ' + labels[evt.edge.v] + ' (w=' + evt.edge.w + ')<br>';
      html += '<strong>Same component &rarr; would create cycle</strong>';
      html += '</div>';
    } else if (evt.type === 'done') {
      html = '<div class="step-title">Complete!</div>';
      html += 'MST has <span class="highlight">' + evt.mstEdges.length + '</span> edges';
      html += ' with total weight <span class="highlight">' + evt.totalWeight + '</span>.<br><br>';
      html += '<div style="color:#4ade80;">Minimum spanning tree found.</div>';
    }

    el.innerHTML = html;
  }

  function updateKruskalEdgeList(labels) {
    var el = document.getElementById('edgeList');
    if (kruskalSortedEdges.length === 0) {
      el.innerHTML = '<span style="color:#555; font-size:0.82rem;">Edges not yet sorted</span>';
      return;
    }

    var html = '';
    for (var i = 0; i < kruskalSortedEdges.length; i++) {
      var se = kruskalSortedEdges[i];
      var status = kruskalEdgeStatus[i] || 'pending';
      if (i === kruskalCurrentIdx && !kruskalEdgeStatus[i]) {
        status = 'considering';
      }
      html += '<div class="edge-item ' + status + '">';
      html += '<span>' + labels[se.u] + ' &mdash; ' + labels[se.v] + '</span>';
      html += '<span>w=' + se.w + '</span>';
      html += '</div>';
    }
    el.innerHTML = html;
  }

  function updateKruskalPseudocode(evt) {
    var lines = document.querySelectorAll('#kruskalCode .line');
    var activeLine = -1;

    if (evt.type === 'init') activeLine = 2;       // T = {}
    else if (evt.type === 'sort') activeLine = 1;   // sort edges
    else if (evt.type === 'consider-edge') activeLine = 5; // if findSet(u) != findSet(v)
    else if (evt.type === 'accept-edge') activeLine = 6;   // T = T + {(u,v,w)}
    else if (evt.type === 'reject-edge') activeLine = 5;   // if findSet check failed
    else if (evt.type === 'done') activeLine = 8;           // return T

    lines.forEach(function (line) {
      var ln = parseInt(line.getAttribute('data-line'), 10);
      line.classList.toggle('active', ln === activeLine);
    });
  }

  // ========== PRIM EVENT HANDLING ==========

  function handlePrimEvent(evt, index, preset) {
    var n = preset.n;
    var labels = preset.labels;

    // Collect state snapshots
    var keySnap = evt.keySnapshot || null;
    var parSnap = evt.parentSnapshot || null;
    var finSnap = evt.finalizedSnapshot || null;

    // Walk events to find latest finalized snapshot if not in current event
    if (!finSnap) {
      for (var k = index; k >= 0; k--) {
        if (events[k].finalizedSnapshot) {
          finSnap = events[k].finalizedSnapshot;
          break;
        }
      }
    }
    if (!keySnap) {
      for (var k2 = index; k2 >= 0; k2--) {
        if (events[k2].keySnapshot) {
          keySnap = events[k2].keySnapshot;
          break;
        }
      }
    }
    if (!parSnap) {
      for (var k3 = index; k3 >= 0; k3--) {
        if (events[k3].parentSnapshot) {
          parSnap = events[k3].parentSnapshot;
          break;
        }
      }
    }
    if (!finSnap) finSnap = Array(n).fill(false);
    if (!keySnap) keySnap = Array(n).fill(Infinity);
    if (!parSnap) parSnap = Array(n).fill(-1);

    // Collect MST edges from finalized vertices
    var mstEdgeKeys = {};
    for (var i = 0; i < n; i++) {
      if (finSnap[i] && parSnap[i] !== -1) {
        mstEdgeKeys[edgeKey(parSnap[i], i)] = true;
      }
    }

    // --- Build render config ---
    var vertices = [];
    var edgeConfigs = [];
    var distLabels = {};

    for (var vi = 0; vi < n; vi++) {
      var state = 'default';
      if (finSnap[vi]) state = 'finalized';
      if (evt.type === 'extract' && evt.vertex === vi) state = 'active';
      if ((evt.type === 'relax' || evt.type === 'relax-skip' || evt.type === 'consider-edge') && evt.from === vi) state = 'active';

      vertices.push({
        id: vi,
        label: labels[vi],
        x: preset.positions[vi].x,
        y: preset.positions[vi].y,
        state: state
      });

      distLabels[vi] = keySnap[vi] === Infinity ? '\u221E' : String(keySnap[vi]);
    }

    // Edge rendering
    var relaxEdgeKey = null;
    var relaxSuccess = false;
    if (evt.type === 'relax' || evt.type === 'relax-skip') {
      relaxEdgeKey = edgeKey(evt.from, evt.to);
      relaxSuccess = evt.type === 'relax';
    }
    var considerEdgeKey = null;
    if (evt.type === 'consider-edge') {
      considerEdgeKey = edgeKey(evt.from, evt.to);
    }

    for (var ei = 0; ei < currentEdges.length; ei++) {
      var ce = currentEdges[ei];
      var u = ce[0], v = ce[1], w = ce[2];
      var eState = 'default';
      var ek = edgeKey(u, v);

      if (mstEdgeKeys[ek]) eState = 'mst';
      if (considerEdgeKey && ek === considerEdgeKey) eState = 'considering';
      if (relaxEdgeKey && ek === relaxEdgeKey) {
        eState = relaxSuccess ? 'relaxing' : 'relaxFail';
      }

      edgeConfigs.push({ u: u, v: v, w: w, state: eState });
    }

    AlgoVis.renderGraph(canvas, {
      vertices: vertices,
      edges: edgeConfigs,
      distLabels: distLabels
    });

    // --- Update sidebar ---
    updatePrimStepInfo(evt, index, labels);
    updatePrimKeyTable(keySnap, finSnap, parSnap, labels, n, evt);
    updatePrimPQ(keySnap, finSnap, labels, n);
    updatePrimPseudocode(evt);

    // MST weight
    var mstWeight = 0;
    for (var wi = 0; wi < n; wi++) {
      if (finSnap[wi] && parSnap[wi] !== -1) {
        mstWeight += keySnap[wi];
      }
    }
    document.getElementById('mstWeight').textContent = mstWeight;
  }

  function updatePrimStepInfo(evt, index, labels) {
    var el = document.getElementById('stepInfo');
    var html = '';

    if (evt.type === 'init') {
      html = '<div class="step-title">Ready</div>';
      html += 'Source: <span class="highlight">' + labels[evt.source] + '</span> (key=0). ';
      html += 'Click <strong>Step Forward</strong> to begin.';
    } else if (evt.type === 'extract') {
      html = '<div class="step-title">Extract min: ' + labels[evt.vertex] + '</div>';
      html += 'Vertex <span class="highlight">' + labels[evt.vertex] + '</span> ';
      html += 'has smallest key: <span class="highlight">' + evt.key + '</span>.<br><br>';
      html += '<strong>Greedy choice:</strong> add the lightest edge crossing the cut to the MST.';
    } else if (evt.type === 'consider-edge') {
      html = '<div class="step-title">Examining: ' + labels[evt.from] + ' &rarr; ' + labels[evt.to] + '</div>';
      html += 'Edge weight: <span class="highlight">' + evt.weight + '</span>. Checking if w(u,v) < key[v]...';
    } else if (evt.type === 'relax') {
      html = '<div class="step-title">Key Updated: ' + labels[evt.from] + ' &rarr; ' + labels[evt.to] + '</div>';
      var oldStr = evt.oldKey === Infinity ? '\u221E' : evt.oldKey;
      html += '<div class="relax-detail relax-success">';
      html += 'w(' + labels[evt.from] + ',' + labels[evt.to] + ') = ' + evt.weight + '<br>';
      html += 'vs key[' + labels[evt.to] + '] = ' + oldStr + '<br>';
      html += '<strong>' + evt.weight + ' < ' + oldStr + ' &rarr; UPDATE key = ' + evt.newKey + '</strong>';
      html += '</div>';
    } else if (evt.type === 'relax-skip') {
      html = '<div class="step-title">No Update: ' + labels[evt.from] + ' &rarr; ' + labels[evt.to] + '</div>';
      var oldStr2 = evt.oldKey === Infinity ? '\u221E' : evt.oldKey;
      html += '<div class="relax-detail relax-fail">';
      html += 'w(' + labels[evt.from] + ',' + labels[evt.to] + ') = ' + evt.weight + '<br>';
      html += 'vs key[' + labels[evt.to] + '] = ' + oldStr2 + '<br>';
      html += '<strong>' + evt.weight + ' >= ' + oldStr2 + ' &rarr; NO CHANGE</strong>';
      html += '</div>';
    } else if (evt.type === 'done') {
      html = '<div class="step-title">Complete!</div>';
      html += 'MST has <span class="highlight">' + evt.mstEdges.length + '</span> edges';
      html += ' with total weight <span class="highlight">' + evt.totalWeight + '</span>.<br><br>';
      html += '<div style="color:#4ade80;">Minimum spanning tree found.</div>';
    }

    el.innerHTML = html;
  }

  function updatePrimKeyTable(keySnap, finSnap, parSnap, labels, n, evt) {
    var tbody = document.getElementById('keyBody');
    var html = '';
    for (var i = 0; i < n; i++) {
      var kStr = keySnap[i] === Infinity ? '\u221E' : keySnap[i];
      var pStr = parSnap[i] === -1 ? '-' : labels[parSnap[i]];
      var status = finSnap[i] ? '\u2713' : 'in PQ';

      var rowClass = '';
      if (evt.type === 'extract' && evt.vertex === i) rowClass = ' class="current"';

      var keyClass = finSnap[i] ? 'finalized' : '';
      if (evt.type === 'relax' && evt.to === i) keyClass += ' updated';

      html += '<tr' + rowClass + '>';
      html += '<td>' + labels[i] + '</td>';
      html += '<td class="' + keyClass + '">' + kStr + '</td>';
      html += '<td>' + pStr + '</td>';
      html += '<td>' + status + '</td>';
      html += '</tr>';
    }
    tbody.innerHTML = html;
  }

  function updatePrimPQ(keySnap, finSnap, labels, n) {
    var el = document.getElementById('pqDisplay');
    var items = [];
    for (var i = 0; i < n; i++) {
      if (!finSnap[i]) {
        items.push({ idx: i, k: keySnap[i] });
      }
    }

    if (items.length === 0) {
      el.innerHTML = '<span style="color:#555; font-size:0.82rem;">Empty</span>';
      return;
    }

    items.sort(function (a, b) { return a.k - b.k; });
    var minKey = items[0].k;

    el.innerHTML = items.map(function (item) {
      var kStr = item.k === Infinity ? '\u221E' : item.k;
      var cls = 'pq-item' + (item.k === minKey ? ' min' : '');
      return '<div class="' + cls + '"><span>' + labels[item.idx] + '</span><span>' + kStr + '</span></div>';
    }).join('');
  }

  function updatePrimPseudocode(evt) {
    var lines = document.querySelectorAll('#primCode .line');
    var activeLine = -1;

    if (evt.type === 'init') activeLine = 2;              // key[s] = 0
    else if (evt.type === 'extract') activeLine = 5;      // u = extractMin
    else if (evt.type === 'consider-edge') activeLine = 6; // for each neighbor v
    else if (evt.type === 'relax') activeLine = 8;         // key[v] = w(u,v)
    else if (evt.type === 'relax-skip') activeLine = 7;    // if w(u,v) < key[v]
    else if (evt.type === 'done') activeLine = 10;         // return

    lines.forEach(function (line) {
      var ln = parseInt(line.getAttribute('data-line'), 10);
      line.classList.toggle('active', ln === activeLine);
    });
  }

  // ========== HELPERS ==========

  function edgeKey(u, v) {
    return Math.min(u, v) + '-' + Math.max(u, v);
  }

  // ---- Resize handling ----
  var lastEvent = null;

  function handleResize() {
    if (lastEvent) {
      onEvent(lastEvent.evt, lastEvent.index);
    }
  }

  window.addEventListener('resize', handleResize);

  // ---- Initialize ----
  switchAlgoPanels();
  loadPreset(0);
})();
