/* ============================================
   CS 141 — Dijkstra Visualizer UI
   ============================================ */

(function () {
  'use strict';

  var presets = AlgoVis.GRAPH_PRESETS;
  var canvas  = document.getElementById('graphCanvas');
  var presetBtnsContainer = document.getElementById('presetBtns');
  var negToggle = document.getElementById('negToggle');

  var currentPresetIndex = 0;
  var negativeEnabled = false;
  var player = null;
  var events = [];
  var currentAdj = null;
  var currentEdges = null;

  // ---- Preset buttons ----
  presets.forEach(function (p, i) {
    var btn = document.createElement('button');
    btn.className = 'preset-btn' + (i === 0 ? ' active' : '');
    btn.textContent = p.name;
    btn.addEventListener('click', function () { loadPreset(i); });
    presetBtnsContainer.appendChild(btn);
  });

  // ---- Negative toggle ----
  negToggle.addEventListener('click', function () {
    negativeEnabled = !negativeEnabled;
    negToggle.classList.toggle('active', negativeEnabled);
    rebuildAndRun();
  });

  // ---- Core logic ----
  function loadPreset(index) {
    currentPresetIndex = index;
    negativeEnabled = false;
    negToggle.classList.remove('active');

    // Highlight active button
    var btns = presetBtnsContainer.querySelectorAll('.preset-btn');
    btns.forEach(function (b, i) {
      b.classList.toggle('active', i === index);
    });

    rebuildAndRun();
  }

  function rebuildAndRun() {
    var preset = presets[currentPresetIndex];
    var edges = preset.edges.slice();

    if (negativeEnabled) {
      var neg = AlgoVis.NEGATIVE_EDGES[preset.name];
      if (neg) {
        edges = edges.concat(neg);
      }
    }

    currentEdges = edges;
    currentAdj = AlgoVis.buildAdj(preset.n, edges);
    events = AlgoVis.runDijkstra(preset.n, currentAdj, preset.source);

    // Destroy old player listeners by recreating buttons
    // (createPlayer binds to existing DOM ids, so just call it fresh)
    if (player) {
      player.pause();
    }
    player = AlgoVis.createPlayer(events, onEvent);
  }

  // ---- Event handler ----
  function onEvent(evt, index) {
    var preset = presets[currentPresetIndex];
    var n = preset.n;
    var labels = preset.labels;
    var dist = evt.distSnapshot;
    var fin = evt.finalizedSnapshot;
    var par = evt.parentSnapshot;
    var total = events.length;

    // --- Build render config ---
    var vertices = [];
    var edgeConfigs = [];
    var distLabels = {};

    // Vertices
    for (var i = 0; i < n; i++) {
      var state = 'default';
      if (fin[i]) state = 'finalized';
      if (evt.type === 'extract' && evt.vertex === i) state = 'active';
      if ((evt.type === 'relax' || evt.type === 'relax-skip') && evt.from === i) state = 'active';

      vertices.push({
        id: i,
        label: labels[i],
        x: preset.positions[i].x,
        y: preset.positions[i].y,
        state: state
      });

      distLabels[i] = dist[i] === Infinity ? '\u221E' : String(dist[i]);
    }

    // Edges
    var relaxEdgeKey = null;
    if (evt.type === 'relax' || evt.type === 'relax-skip') {
      relaxEdgeKey = edgeKey(evt.from, evt.to);
    }

    for (var ei = 0; ei < currentEdges.length; ei++) {
      var e = currentEdges[ei];
      var u = e[0], v = e[1], w = e[2];
      var eState = 'default';

      // Negative edge styling
      if (w < 0) {
        eState = 'negative';
      }

      // SPT edges (parent relationship, both finalized)
      if (par[v] === u && fin[v]) eState = 'spt';
      if (par[u] === v && fin[u]) eState = 'spt';

      // Current relaxing edge overrides
      if (relaxEdgeKey && edgeKey(u, v) === relaxEdgeKey) {
        eState = evt.success ? 'relaxing' : 'relaxFail';
      }

      edgeConfigs.push({ u: u, v: v, w: w, state: eState });
    }

    AlgoVis.renderGraph(canvas, {
      vertices: vertices,
      edges: edgeConfigs,
      distLabels: distLabels
    });

    // --- Update sidebar ---
    updateStepInfo(evt, index, total, labels);
    updatePQ(dist, fin, labels, n);
    updateDistTable(dist, fin, par, labels, n, evt);
    updatePseudocode(evt);
    updateCounters(index);
  }

  function edgeKey(u, v) {
    return Math.min(u, v) + '-' + Math.max(u, v);
  }

  // ---- Step Info ----
  function updateStepInfo(evt, index, total, labels) {
    var el = document.getElementById('stepInfo');
    var html = '';

    if (evt.type === 'init') {
      html = '<div class="step-title">Ready</div>';
      html += 'Source: <span class="highlight">' + labels[evt.source] + '</span> (d=0). ';
      html += 'Click <strong>Step Forward</strong> to begin.';
    } else if (evt.type === 'extract') {
      html = '<div class="step-title">Extract min: ' + labels[evt.vertex] + '</div>';
      html += 'Vertex <span class="highlight">' + labels[evt.vertex] + '</span> ';
      html += 'has smallest tentative distance: <span class="highlight">' + evt.dist + '</span>.<br><br>';
      html += '<strong>Greedy choice:</strong> smallest tentative distance is finalized &mdash; ';
      html += 'no future path through unprocessed vertices can beat it (all edges are non-negative).';
    } else if (evt.type === 'relax' || evt.type === 'relax-skip') {
      var fromL = labels[evt.from];
      var toL = labels[evt.to];
      html = '<div class="step-title">Relaxing: ' + fromL + ' &rarr; ' + toL + '</div>';
      var oldStr = evt.oldDist === Infinity ? '\u221E' : evt.oldDist;
      var resultClass = evt.success ? 'relax-success' : 'relax-fail';
      var resultText = evt.success ? 'UPDATED' : 'NO CHANGE';
      html += '<div class="relax-detail ' + resultClass + '">';
      html += 'd[' + fromL + '] + w = ' + (evt.newDist) + '<br>';
      html += 'vs d[' + toL + '] = ' + oldStr + '<br>';
      html += '<strong>&rarr; ' + resultText + '</strong>';
      html += '</div>';

      if (evt.negativeWarning) {
        html += '<div style="background:#3a1a1a; border:1px solid #f87171; border-radius:8px; padding:10px; margin-top:8px; font-size:0.85rem;">';
        html += '<strong style="color:#f87171;">Warning:</strong> Updating an already-finalized vertex! ';
        html += 'Dijkstra assumes this cannot happen (greedy guarantee broken by negative edge).';
        html += '</div>';
      }
    } else if (evt.type === 'done') {
      // Count relaxations
      var relaxCount = 0, successCount = 0;
      for (var k = 0; k < events.length; k++) {
        if (events[k].type === 'relax' || events[k].type === 'relax-skip') relaxCount++;
        if (events[k].type === 'relax') successCount++;
      }
      html = '<div class="step-title">Complete!</div>';
      html += '<span class="highlight">' + relaxCount + '</span> relaxations, ';
      html += '<span class="highlight">' + successCount + '</span> successful.<br><br>';
      if (evt.negativeWarning) {
        html += '<div style="background:#3a1a1a; border:1px solid #f87171; border-radius:8px; padding:12px;">';
        html += '<strong style="color:#f87171;">Negative edge detected!</strong><br>';
        html += 'Dijkstra produced <strong>incorrect results</strong> because a finalized vertex was later improved. ';
        html += 'Use <strong>Bellman-Ford</strong> for graphs with negative edges.';
        html += '</div>';
      } else {
        html += '<div style="color:#4ade80;">All shortest paths found correctly.</div>';
      }
    }

    el.innerHTML = html;
  }

  // ---- Priority Queue ----
  function updatePQ(dist, fin, labels, n) {
    var el = document.getElementById('pqDisplay');
    var items = [];
    for (var i = 0; i < n; i++) {
      if (!fin[i]) {
        items.push({ idx: i, d: dist[i] });
      }
    }

    if (items.length === 0) {
      el.innerHTML = '<span style="color:#555; font-size:0.82rem;">Empty</span>';
      return;
    }

    items.sort(function (a, b) { return a.d - b.d; });
    var minDist = items[0].d;

    el.innerHTML = items.map(function (item) {
      var dStr = item.d === Infinity ? '\u221E' : item.d;
      var cls = 'pq-item' + (item.d === minDist ? ' min' : '');
      return '<div class="' + cls + '"><span>' + labels[item.idx] + '</span><span>' + dStr + '</span></div>';
    }).join('');
  }

  // ---- Distance Table ----
  function updateDistTable(dist, fin, par, labels, n, evt) {
    var tbody = document.getElementById('distBody');
    var html = '';
    for (var i = 0; i < n; i++) {
      var dStr = dist[i] === Infinity ? '\u221E' : dist[i];
      var pStr = par[i] === -1 ? '-' : labels[par[i]];
      var status = fin[i] ? '\u2713' : 'in PQ';

      var rowClass = '';
      if (evt.type === 'extract' && evt.vertex === i) rowClass = ' class="current"';

      var distClass = fin[i] ? 'finalized' : '';
      if ((evt.type === 'relax') && evt.to === i) distClass += ' updated';

      html += '<tr' + rowClass + '>';
      html += '<td>' + labels[i] + '</td>';
      html += '<td class="' + distClass + '">' + dStr + '</td>';
      html += '<td>' + pStr + '</td>';
      html += '<td>' + status + '</td>';
      html += '</tr>';
    }
    tbody.innerHTML = html;
  }

  // ---- Pseudocode highlighting ----
  function updatePseudocode(evt) {
    var lines = document.querySelectorAll('#pseudocode .line');
    var activeLine = -1;

    if (evt.type === 'init') {
      activeLine = 3; // d[s] = 0
    } else if (evt.type === 'extract') {
      activeLine = 6; // u = extractMin
    } else if (evt.type === 'relax') {
      activeLine = 10; // d[v] = d[u]+w(u,v)
    } else if (evt.type === 'relax-skip') {
      activeLine = 9; // if d[u]+w(u,v) < d[v]
    } else if (evt.type === 'done') {
      activeLine = 12; // return
    }

    lines.forEach(function (line) {
      var ln = parseInt(line.getAttribute('data-line'), 10);
      line.classList.toggle('active', ln === activeLine);
    });
  }

  // ---- Counters ----
  function updateCounters(index) {
    var relaxTotal = 0, relaxSuccess = 0;
    for (var k = 0; k <= index; k++) {
      var t = events[k].type;
      if (t === 'relax' || t === 'relax-skip') relaxTotal++;
      if (t === 'relax') relaxSuccess++;
    }
    document.getElementById('relaxCount').textContent = relaxTotal;
    document.getElementById('successCount').textContent = relaxSuccess;
  }

  // ---- Resize handling ----
  function handleResize() {
    if (player && events.length > 0) {
      // Re-render current state by re-firing current event
      // We access internal state through a small trick: jump to current
      // Just redraw using the last known event
    }
    // The canvas is resized automatically by renderGraph via clientWidth/clientHeight
    // We just need to trigger a redraw
    var currentIndex = 0;
    // Find current index from counters display
    var relaxEl = document.getElementById('relaxCount');
    // Simpler: just reset to re-render
    // Actually, renderGraph handles DPR scaling, so we just need to call it again.
    // The player doesn't expose currentIndex, so we store it ourselves.
    if (lastEvent) {
      onEvent(lastEvent.evt, lastEvent.index);
    }
  }

  var lastEvent = null;
  var origOnEvent = onEvent;
  onEvent = function (evt, index) {
    lastEvent = { evt: evt, index: index };
    origOnEvent(evt, index);
  };

  window.addEventListener('resize', handleResize);

  // ---- Initialize ----
  loadPreset(0);
})();
