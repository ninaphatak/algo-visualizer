/* ============================================
   CS 141 — Bellman-Ford Visualizer UI
   Mirrors Dijkstra UI layout with BF-specific features:
   round display, round history, directed edges, negative toggle
   ============================================ */

(function () {
  'use strict';

  var presets = AlgoVis.GRAPH_PRESETS;
  var canvas = document.getElementById('graphCanvas');
  var presetBtnsContainer = document.getElementById('presetBtns');
  var negToggle = document.getElementById('negToggle');

  var currentPresetIndex = 0;
  var negativeEnabled = false;
  var player = null;
  var events = [];
  var currentEdges = [];      // undirected edge list [u,v,w]
  var directedEdges = [];     // doubled for BF

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

    var btns = presetBtnsContainer.querySelectorAll('.preset-btn');
    btns.forEach(function (b, i) {
      b.classList.toggle('active', i === index);
    });

    rebuildAndRun();
  }

  function rebuildAndRun() {
    var preset = presets[currentPresetIndex];
    currentEdges = preset.edges.slice();

    if (negativeEnabled) {
      var neg = AlgoVis.NEGATIVE_EDGES[preset.name];
      if (neg) {
        currentEdges = currentEdges.concat(neg);
      }
    }

    // Double undirected edges for BF (directed edge list)
    directedEdges = [];
    currentEdges.forEach(function (e) {
      directedEdges.push([e[0], e[1], e[2]]);
      directedEdges.push([e[1], e[0], e[2]]);
    });

    events = AlgoVis.runBellmanFord(preset.n, directedEdges, preset.source);

    if (player) player.pause();
    player = AlgoVis.createPlayer(events, onEvent);
  }

  // ---- Event handler ----
  var lastEvent = null;

  function onEvent(evt, index) {
    lastEvent = { evt: evt, index: index };
    var preset = presets[currentPresetIndex];
    var n = preset.n;
    var labels = preset.labels;

    renderGraph(evt, preset);
    updateStepInfo(evt, labels);
    updateRoundDisplay(evt, n);
    updateDistTable(evt, labels, n);
    updateRoundHistory(evt, labels, n, index);
    updatePseudocode(evt);
    updateCounters(index);
    updateComparison();
  }

  // ---- Graph rendering ----
  function renderGraph(evt, preset) {
    var n = preset.n;
    var labels = preset.labels;
    var distSnap = evt.distSnapshot || evt.dist || null;

    var vertices = [];
    for (var i = 0; i < n; i++) {
      var state = 'default';
      if (evt.type === 'init' && i === evt.source) state = 'active';
      if ((evt.type === 'relax' || evt.type === 'relax-fail') && (i === evt.from || i === evt.to)) state = 'active';
      if (evt.type === 'done' && !evt.negativeCycle) state = 'finalized';
      if (evt.type === 'negative-cycle-check') {
        var ce = evt.edge;
        if (i === ce.from || i === ce.to) state = 'active';
      }

      vertices.push({
        id: i,
        label: labels[i],
        x: preset.positions[i].x,
        y: preset.positions[i].y,
        state: state
      });
    }

    // Build edge display — show undirected edges but highlight directed relaxation
    var edgeConfigs = [];
    var relaxKey = null;
    if (evt.type === 'relax' || evt.type === 'relax-fail') {
      relaxKey = evt.from + '-' + evt.to;
    }
    var cycleKey = null;
    if (evt.type === 'negative-cycle-check') {
      cycleKey = evt.edge.from + '-' + evt.edge.to;
    }

    currentEdges.forEach(function (e) {
      var u = e[0], v = e[1], w = e[2];
      var eState = 'default';

      if (w < 0) eState = 'negative';

      // Check if this undirected edge matches the directed relaxation
      if (relaxKey) {
        if (u + '-' + v === relaxKey || v + '-' + u === relaxKey) {
          eState = evt.success ? 'relaxing' : 'relaxFail';
        }
      }
      if (cycleKey) {
        if (u + '-' + v === cycleKey || v + '-' + u === cycleKey) {
          eState = evt.improved ? 'relaxFail' : 'considering';
        }
      }

      edgeConfigs.push({ u: u, v: v, w: w, state: eState });
    });

    var distLabels = {};
    if (distSnap) {
      for (var i = 0; i < n; i++) {
        distLabels[i] = distSnap[i] === Infinity ? '\u221E' : String(distSnap[i]);
      }
    }

    AlgoVis.renderGraph(canvas, {
      vertices: vertices,
      edges: edgeConfigs,
      distLabels: distLabels
    });
  }

  // ---- Step Info ----
  function updateStepInfo(evt, labels) {
    var el = document.getElementById('stepInfo');
    var html = '';

    if (evt.type === 'init') {
      html = '<div class="step-title">Ready</div>';
      html += 'Source: <span class="highlight">' + labels[evt.source] + '</span> (d=0). ';
      html += 'Click <strong>Step Forward</strong> to begin.<br><br>';
      html += '<strong>DP approach:</strong> D[v,k] = shortest path to v using at most k edges.';

    } else if (evt.type === 'round-start') {
      html = '<div class="step-title">Round ' + evt.round + '</div>';
      html += 'Relaxing all edges.<br>';
      html += '<span class="highlight">D[v,' + evt.round + '] = min(D[v,' + (evt.round - 1) + '], D[u,' + (evt.round - 1) + '] + w(u,v))</span>';

    } else if (evt.type === 'relax' || evt.type === 'relax-fail') {
      var fromL = labels[evt.from];
      var toL = labels[evt.to];
      html = '<div class="step-title">Relaxing: ' + fromL + ' &rarr; ' + toL + '</div>';
      var oldStr = evt.oldDist === Infinity ? '\u221E' : evt.oldDist;
      var newDistStr = evt.newDist === Infinity ? '\u221E' : evt.newDist;
      var resultClass = evt.success ? 'relax-success' : 'relax-fail';
      var resultText = evt.success ? 'UPDATED' : 'NO CHANGE';
      html += '<div class="relax-detail ' + resultClass + '">';
      html += 'd[' + fromL + '] + w = ' + newDistStr + '<br>';
      html += 'vs d[' + toL + '] = ' + oldStr + '<br>';
      html += '<strong>&rarr; ' + resultText + '</strong>';
      html += '</div>';

    } else if (evt.type === 'round-end') {
      html = '<div class="step-title">Round ' + evt.round + ' Complete</div>';
      html += evt.anyUpdate
        ? 'Updates occurred this round.'
        : '<span style="color:#4ade80;">No updates &mdash; early termination!</span>';

    } else if (evt.type === 'negative-cycle-check') {
      var ce = evt.edge;
      html = '<div class="step-title">Negative Cycle Check</div>';
      html += 'Edge (' + labels[ce.from] + ' &rarr; ' + labels[ce.to] + '), w=' + ce.w + '<br>';
      html += evt.improved
        ? '<div class="relax-detail relax-fail">IMPROVEMENT FOUND &mdash; negative cycle exists!</div>'
        : '<div class="relax-detail">No improvement. OK.</div>';

    } else if (evt.type === 'done') {
      var relaxCount = 0, successCount = 0;
      for (var k = 0; k < events.length; k++) {
        if (events[k].type === 'relax' || events[k].type === 'relax-fail') relaxCount++;
        if (events[k].type === 'relax') successCount++;
      }
      html = '<div class="step-title">Complete!</div>';
      html += '<span class="highlight">' + relaxCount + '</span> relaxations, ';
      html += '<span class="highlight">' + successCount + '</span> successful.<br><br>';
      if (evt.negativeCycle) {
        html += '<div style="background:#3a1a1a; border:1px solid #f87171; border-radius:8px; padding:12px;">';
        html += '<strong style="color:#f87171;">Negative cycle detected!</strong><br>';
        html += 'Bellman-Ford correctly identifies this. Dijkstra would give wrong results.';
        html += '</div>';
      } else {
        html += '<div style="color:#4ade80;">All shortest paths found correctly.</div>';
      }
    }

    el.innerHTML = html;
  }

  // ---- Round Display ----
  function updateRoundDisplay(evt, n) {
    var el = document.getElementById('roundDisplay');
    if (evt.type === 'init') {
      el.innerHTML = '--<span class="sub">initializing</span>';
    } else if (evt.type === 'round-start' || evt.type === 'relax' || evt.type === 'relax-fail') {
      var round = evt.round || findCurrentRound(lastEvent.index);
      el.innerHTML = round + '<span class="sub">of ' + (n - 1) + ' rounds</span>';
    } else if (evt.type === 'round-end') {
      el.innerHTML = evt.round + '<span class="sub">of ' + (n - 1) + (evt.anyUpdate ? '' : ' (done early)') + '</span>';
    } else if (evt.type === 'negative-cycle-check') {
      el.innerHTML = 'n<span class="sub">cycle check</span>';
    } else if (evt.type === 'done') {
      el.innerHTML = 'Done<span class="sub">' + (evt.negativeCycle ? 'negative cycle!' : 'all paths found') + '</span>';
    }
  }

  function findCurrentRound(index) {
    for (var i = index; i >= 0; i--) {
      if (events[i].type === 'round-start') return events[i].round;
    }
    return '?';
  }

  // ---- Distance Table (matches Dijkstra format) ----
  function updateDistTable(evt, labels, n) {
    var dist = evt.distSnapshot || evt.dist || null;
    var par = evt.parentSnapshot || evt.parent || null;
    if (!dist) return;

    var tbody = document.getElementById('distBody');
    var html = '';
    for (var i = 0; i < n; i++) {
      var dStr = dist[i] === Infinity ? '\u221E' : dist[i];
      var pStr = (par && par[i] !== -1) ? labels[par[i]] : '-';
      var status = dist[i] === Infinity ? 'unreached' : '\u2713';

      var rowClass = '';
      if ((evt.type === 'relax') && evt.to === i) rowClass = ' class="current"';

      var distClass = dist[i] !== Infinity ? 'finalized' : '';
      if (evt.type === 'relax' && evt.to === i) distClass += ' updated';

      html += '<tr' + rowClass + '>';
      html += '<td>' + labels[i] + '</td>';
      html += '<td class="' + distClass + '">' + dStr + '</td>';
      html += '<td>' + pStr + '</td>';
      html += '<td>' + status + '</td>';
      html += '</tr>';
    }
    tbody.innerHTML = html;
  }

  // ---- Round History ----
  function updateRoundHistory(evt, labels, n, index) {
    // Collect all round-end snapshots up to current index
    var snapshots = [];
    for (var i = 0; i <= index; i++) {
      if (events[i].type === 'round-end') {
        snapshots.push({ round: events[i].round, dist: events[i].distSnapshot });
      }
    }

    var headEl = document.getElementById('roundHistoryHead');
    var bodyEl = document.getElementById('roundHistoryBody');

    if (snapshots.length === 0) {
      headEl.innerHTML = '';
      bodyEl.innerHTML = '';
      return;
    }

    // Header
    var headHtml = '<tr><th>Round</th>';
    for (var i = 0; i < n; i++) {
      headHtml += '<th>' + labels[i] + '</th>';
    }
    headHtml += '</tr>';
    headEl.innerHTML = headHtml;

    // Body
    var bodyHtml = '';
    for (var r = 0; r < snapshots.length; r++) {
      var snap = snapshots[r];
      var prevSnap = r > 0 ? snapshots[r - 1].dist : null;
      bodyHtml += '<tr><td>' + snap.round + '</td>';
      for (var i = 0; i < n; i++) {
        var changed = prevSnap && prevSnap[i] !== snap.dist[i];
        var initChanged = !prevSnap && snap.dist[i] !== Infinity && i !== presets[currentPresetIndex].source;
        var cls = (changed || initChanged) ? ' class="changed"' : '';
        bodyHtml += '<td' + cls + '>' + (snap.dist[i] === Infinity ? '\u221E' : snap.dist[i]) + '</td>';
      }
      bodyHtml += '</tr>';
    }
    bodyEl.innerHTML = bodyHtml;
  }

  // ---- Pseudocode highlighting ----
  function updatePseudocode(evt) {
    var lines = document.querySelectorAll('#pseudocode .line');
    var activeLine = -1;

    if (evt.type === 'init') activeLine = 2;
    else if (evt.type === 'round-start') activeLine = 3;
    else if (evt.type === 'relax') activeLine = 6;
    else if (evt.type === 'relax-fail') activeLine = 5;
    else if (evt.type === 'round-end') activeLine = 3;
    else if (evt.type === 'negative-cycle-check') activeLine = 10;
    else if (evt.type === 'done') activeLine = 11;

    lines.forEach(function (line) {
      var ln = parseInt(line.getAttribute('data-line'), 10);
      line.classList.toggle('active', ln === activeLine);
    });
  }

  // ---- Counters (recomputed from events, not accumulated — fixes step-back bug) ----
  function updateCounters(index) {
    var relaxTotal = 0, relaxSuccess = 0;
    for (var k = 0; k <= index; k++) {
      var t = events[k].type;
      if (t === 'relax' || t === 'relax-fail') relaxTotal++;
      if (t === 'relax') relaxSuccess++;
    }
    document.getElementById('relaxCount').textContent = relaxTotal;
    document.getElementById('successCount').textContent = relaxSuccess;
  }

  // ---- Comparison stats ----
  function updateComparison() {
    var dijkstraCount = 2 * presets[currentPresetIndex].edges.length;
    var bfCount = 0;
    for (var k = 0; k < events.length; k++) {
      if (events[k].type === 'relax' || events[k].type === 'relax-fail') bfCount++;
    }
    var el = document.getElementById('comparisonStats');
    el.innerHTML =
      'Bellman-Ford total: <span class="val">' + bfCount + '</span> relaxations<br>' +
      'Dijkstra\'s would use: <span class="val">' + dijkstraCount + '</span> relaxations (2m)<br>' +
      '<span style="color:#888;font-size:0.8rem;">BF: O(nm) = ' + (presets[currentPresetIndex].n - 1) + ' rounds &times; ' + directedEdges.length + ' edges</span>';
  }

  // ---- Resize handling ----
  window.addEventListener('resize', function () {
    if (lastEvent) onEvent(lastEvent.evt, lastEvent.index);
  });

  // ---- Initialize ----
  loadPreset(0);
})();
