/* ============================================
   CS 141 — Bellman-Ford Visualizer UI
   ============================================ */

(function () {
  var canvas = document.getElementById('graphCanvas');
  var stepInfo = document.getElementById('stepInfo');
  var roundDisplay = document.getElementById('roundDisplay');
  var distBody = document.getElementById('distBody');
  var roundHistoryHead = document.getElementById('roundHistoryHead');
  var roundHistoryBody = document.getElementById('roundHistoryBody');
  var comparisonStats = document.getElementById('comparisonStats');
  var pseudocode = document.getElementById('pseudocode');
  var presetBtns = document.getElementById('presetBtns');

  var presets = AlgoVis.GRAPH_PRESETS;
  var currentPreset = null;
  var currentLabels = [];
  var currentEdges = [];       // original undirected edges
  var directedEdges = [];      // doubled for BF
  var currentN = 0;
  var currentSource = 0;
  var player = null;

  // Accumulated round history for display
  var roundSnapshots = [];
  var totalRelaxations = 0;

  // ---- Preset buttons ----
  presets.forEach(function (preset, idx) {
    var btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.textContent = preset.name;
    btn.addEventListener('click', function () {
      loadPreset(idx);
    });
    presetBtns.appendChild(btn);
  });

  function loadPreset(idx) {
    currentPreset = presets[idx];
    currentN = currentPreset.n;
    currentLabels = currentPreset.labels;
    currentEdges = currentPreset.edges;
    currentSource = currentPreset.source;

    // Mark active button
    var btns = presetBtns.querySelectorAll('.preset-btn');
    btns.forEach(function (b, i) {
      b.className = i === idx ? 'preset-btn active' : 'preset-btn';
    });

    // Convert undirected edges to directed (double each edge)
    directedEdges = [];
    currentEdges.forEach(function (e) {
      directedEdges.push([e[0], e[1], e[2]]);
      directedEdges.push([e[1], e[0], e[2]]);
    });

    // Reset round history
    roundSnapshots = [];
    totalRelaxations = 0;

    // Run algorithm
    var events = AlgoVis.runBellmanFord(currentN, directedEdges, currentSource);

    // Create player
    player = AlgoVis.createPlayer(events, onEvent);
  }

  // ---- Event handler ----
  function onEvent(evt, idx) {
    highlightPseudocode(-1);
    renderGraphForEvent(evt);

    switch (evt.type) {
      case 'init':
        stepInfo.innerHTML =
          '<div class="step-title">Initialization</div>' +
          'Set d[' + label(evt.source) + '] = 0, all others = INF.<br>' +
          '<span class="highlight">D[v,0] = INF for all v except source</span>';
        roundDisplay.innerHTML = '--<span class="sub">initializing</span>';
        updateDistTable(evt.dist, Array(currentN).fill(-1));
        clearRoundHistory();
        totalRelaxations = 0;
        updateComparison();
        highlightPseudocode(1, 2);
        break;

      case 'round-start':
        stepInfo.innerHTML =
          '<div class="step-title">Round ' + evt.round + ' of ' + (currentN - 1) + '</div>' +
          'Relaxing all edges.<br>' +
          '<span class="highlight">D[v,' + evt.round + '] = min(D[v,' + (evt.round - 1) + '], D[u,' + (evt.round - 1) + '] + w(u,v))</span>';
        roundDisplay.innerHTML = 'Round ' + evt.round + ' of ' + (currentN - 1) +
          '<span class="sub">relaxing edges</span>';
        highlightPseudocode(3, 4);
        break;

      case 'relax':
        totalRelaxations++;
        stepInfo.innerHTML =
          '<div class="step-title">Edge Relaxed</div>' +
          'Edge (' + label(evt.from) + ' &rarr; ' + label(evt.to) + '), w=' + evt.weight + '<br>' +
          '<div class="relax-detail relax-success">' +
          'd[' + label(evt.to) + ']: ' + fmtDist(evt.oldDist) + ' &rarr; ' + fmtDist(evt.newDist) +
          '</div>' +
          '<span class="highlight">D[v,k] = min(D[v,k-1], D[u,k-1] + w(u,v))</span>';
        updateDistTable(evt.distSnapshot, evt.parentSnapshot, evt.to);
        updateComparison();
        highlightPseudocode(5, 6, 7);
        break;

      case 'relax-fail':
        totalRelaxations++;
        stepInfo.innerHTML =
          '<div class="step-title">No Improvement</div>' +
          'Edge (' + label(evt.from) + ' &rarr; ' + label(evt.to) + '), w=' + evt.weight + '<br>' +
          '<div class="relax-detail relax-fail">' +
          'd[' + label(evt.from) + ']+' + evt.weight + ' = ' + fmtDist(evt.newDist) +
          ' &ge; d[' + label(evt.to) + '] = ' + fmtDist(evt.oldDist) +
          '</div>';
        updateDistTable(evt.distSnapshot, evt.parentSnapshot);
        updateComparison();
        highlightPseudocode(5);
        break;

      case 'round-end':
        roundSnapshots.push(evt.distSnapshot);
        stepInfo.innerHTML =
          '<div class="step-title">Round ' + evt.round + ' Complete</div>' +
          (evt.anyUpdate
            ? 'Updates occurred this round.'
            : 'No updates — early termination!');
        roundDisplay.innerHTML = 'Round ' + evt.round + ' of ' + (currentN - 1) +
          '<span class="sub">' + (evt.anyUpdate ? 'updates made' : 'no changes — done') + '</span>';
        updateDistTable(evt.distSnapshot, evt.parentSnapshot);
        updateRoundHistory();
        highlightPseudocode(3);
        break;

      case 'negative-cycle-check':
        var e = evt.edge;
        stepInfo.innerHTML =
          '<div class="step-title">Negative Cycle Check</div>' +
          'Edge (' + label(e.from) + ' &rarr; ' + label(e.to) + '), w=' + e.w + '<br>' +
          (evt.improved
            ? '<div class="relax-detail relax-fail">IMPROVEMENT FOUND — negative cycle exists!</div>'
            : '<div class="relax-detail">No improvement. OK.</div>');
        highlightPseudocode(9, 10);
        break;

      case 'done':
        stepInfo.innerHTML =
          '<div class="step-title">Algorithm Complete</div>' +
          (evt.negativeCycle
            ? '<div class="relax-detail relax-fail">Negative cycle detected!</div>'
            : 'Shortest paths found from ' + label(currentSource) + '.<br>' +
              'Final distances: [' + evt.dist.map(fmtDist).join(', ') + ']');
        roundDisplay.innerHTML = 'Done' +
          '<span class="sub">' + (evt.negativeCycle ? 'negative cycle!' : 'all shortest paths found') + '</span>';
        updateDistTable(evt.dist, evt.parent);
        updateComparison();
        highlightPseudocode(11);
        break;
    }
  }

  // ---- Graph rendering ----
  function renderGraphForEvent(evt) {
    var vertices = [];
    var edges = [];

    // Determine dist snapshot for labels
    var distSnap = evt.distSnapshot || evt.dist || null;

    for (var i = 0; i < currentN; i++) {
      var state = 'default';
      if (evt.type === 'relax' && i === evt.to) state = 'active';
      if (evt.type === 'relax-fail' && (i === evt.from || i === evt.to)) state = 'active';
      if (evt.type === 'done' && !evt.negativeCycle) state = 'finalized';
      if (evt.type === 'init' && i === currentSource) state = 'active';

      vertices.push({
        id: i,
        label: currentLabels[i],
        x: currentPreset.positions[i].x,
        y: currentPreset.positions[i].y,
        state: state
      });
    }

    // Build edge display list (show undirected edges)
    var edgeSet = {};
    currentEdges.forEach(function (e) {
      var u = e[0], v = e[1], w = e[2];
      var key = Math.min(u, v) + '-' + Math.max(u, v);
      var edgeState = 'default';

      // Highlight current edge being relaxed
      if (evt.type === 'relax' || evt.type === 'relax-fail') {
        if ((u === evt.from && v === evt.to) || (v === evt.from && u === evt.to)) {
          edgeState = evt.type === 'relax' ? 'relaxing' : 'relaxFail';
        }
      }
      if (evt.type === 'negative-cycle-check') {
        var ce = evt.edge;
        if ((u === ce.from && v === ce.to) || (v === ce.from && u === ce.to)) {
          edgeState = evt.improved ? 'relaxFail' : 'considering';
        }
      }

      if (!edgeSet[key] || edgeState !== 'default') {
        edgeSet[key] = { u: u, v: v, w: w, state: edgeState };
      }
    });

    for (var key in edgeSet) {
      edges.push(edgeSet[key]);
    }

    // Distance labels
    var distLabels = {};
    if (distSnap) {
      for (var i = 0; i < currentN; i++) {
        distLabels[i] = distSnap[i] === Infinity ? '\u221E' : distSnap[i];
      }
    }

    AlgoVis.renderGraph(canvas, {
      vertices: vertices,
      edges: edges,
      distLabels: distLabels
    });
  }

  // ---- Distance table ----
  function updateDistTable(dist, parent, updatedVertex) {
    var html = '';
    for (var i = 0; i < currentN; i++) {
      var cls = '';
      if (updatedVertex === i) cls = ' class="updated current"';
      html += '<tr' + cls + '>' +
        '<td>' + currentLabels[i] + '</td>' +
        '<td>' + fmtDist(dist[i]) + '</td>' +
        '<td>' + (parent[i] === -1 ? '-' : currentLabels[parent[i]]) + '</td>' +
        '</tr>';
    }
    distBody.innerHTML = html;
  }

  // ---- Round history table ----
  function clearRoundHistory() {
    roundSnapshots = [];
    roundHistoryHead.innerHTML = '';
    roundHistoryBody.innerHTML = '';
  }

  function updateRoundHistory() {
    // Header: Round | v0 | v1 | ...
    var headHtml = '<tr><th>Round</th>';
    for (var i = 0; i < currentN; i++) {
      headHtml += '<th>' + currentLabels[i] + '</th>';
    }
    headHtml += '</tr>';
    roundHistoryHead.innerHTML = headHtml;

    // Body: one row per completed round
    var bodyHtml = '';
    for (var r = 0; r < roundSnapshots.length; r++) {
      var snap = roundSnapshots[r];
      var prevSnap = r > 0 ? roundSnapshots[r - 1] : null;
      bodyHtml += '<tr><td>' + (r + 1) + '</td>';
      for (var i = 0; i < currentN; i++) {
        var changed = prevSnap && prevSnap[i] !== snap[i];
        var initChanged = r === 0 && snap[i] !== Infinity && i !== currentSource;
        bodyHtml += '<td' + ((changed || initChanged) ? ' class="changed"' : '') + '>' +
          fmtDist(snap[i]) + '</td>';
      }
      bodyHtml += '</tr>';
    }
    roundHistoryBody.innerHTML = bodyHtml;
  }

  // ---- Comparison stats ----
  function updateComparison() {
    var dijkstraCount = 2 * currentEdges.length; // 2m for undirected graph
    comparisonStats.innerHTML =
      'Bellman-Ford relaxations: <span class="val">' + totalRelaxations + '</span><br>' +
      'Dijkstra\'s would use: <span class="val">' + dijkstraCount + '</span> relaxations (2m)';
  }

  // ---- Pseudocode highlighting ----
  function highlightPseudocode() {
    var lines = pseudocode.querySelectorAll('.line');
    var activeLines = Array.prototype.slice.call(arguments);
    lines.forEach(function (el) {
      var lineNum = parseInt(el.getAttribute('data-line'), 10);
      el.className = activeLines.indexOf(lineNum) >= 0 ? 'line active' : 'line';
    });
  }

  // ---- Helpers ----
  function label(i) {
    return currentLabels[i] || String(i);
  }

  function fmtDist(d) {
    return d === Infinity ? '\u221E' : d;
  }

  // Auto-load first preset
  loadPreset(0);
})();
