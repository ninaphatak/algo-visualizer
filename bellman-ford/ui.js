/* ============================================
   CS 141 — Bellman-Ford Visualizer UI
   DP-centric layout: directed graph + D[v,k] table + edge list
   ============================================ */

(function () {
  'use strict';

  // ---- BF-specific directed graph presets (with negative weights built in) ----
  var BF_PRESETS = [
    {
      name: 'Directed (neg. edges)',
      n: 5,
      labels: ['S', 'A', 'B', 'C', 'D'],
      // Directed edges: some negative
      edges: [
        [0, 1, 6],   // S→A
        [0, 3, 7],   // S→C (note: using C=index 3)
        [1, 2, 5],   // A→B
        [1, 3, 8],   // A→C
        [1, 4, -4],  // A→D (negative!)
        [2, 1, -2],  // B→A (negative!)
        [3, 2, -3],  // C→B (negative!)
        [3, 4, 9],   // C→D
        [4, 2, 7],   // D→B
        [4, 0, 2],   // D→S
      ],
      source: 0,
      positions: [
        { x: 0, y: 1.5 },   // S
        { x: 1.5, y: 0 },   // A
        { x: 3, y: 0 },     // B
        { x: 1.5, y: 3 },   // C
        { x: 3, y: 3 },     // D
      ]
    },
    {
      name: 'Simple directed',
      n: 4,
      labels: ['S', 'A', 'B', 'C'],
      edges: [
        [0, 1, 3],   // S→A
        [0, 2, 5],   // S→B
        [1, 2, -2],  // A→B (negative!)
        [1, 3, 6],   // A→C
        [2, 3, 2],   // B→C
      ],
      source: 0,
      positions: [
        { x: 0, y: 1 },
        { x: 2, y: 0 },
        { x: 2, y: 2 },
        { x: 4, y: 1 },
      ]
    },
    {
      name: 'Negative cycle',
      n: 4,
      labels: ['S', 'A', 'B', 'C'],
      edges: [
        [0, 1, 1],   // S→A
        [1, 2, -1],  // A→B
        [2, 3, -1],  // B→C
        [3, 1, -1],  // C→A (creates negative cycle A→B→C→A = -3)
      ],
      source: 0,
      positions: [
        { x: 0, y: 1 },
        { x: 2, y: 0 },
        { x: 4, y: 0 },
        { x: 3, y: 2 },
      ]
    }
  ];

  var canvas = document.getElementById('graphCanvas');
  var presetBtnsContainer = document.getElementById('presetBtns');

  var currentPresetIndex = 0;
  var currentPreset = null;
  var player = null;
  var events = [];

  // ---- Preset buttons ----
  BF_PRESETS.forEach(function (p, i) {
    var btn = document.createElement('button');
    btn.className = 'preset-btn' + (i === 0 ? ' active' : '');
    btn.textContent = p.name;
    btn.addEventListener('click', function () { loadPreset(i); });
    presetBtnsContainer.appendChild(btn);
  });

  function loadPreset(index) {
    currentPresetIndex = index;
    currentPreset = BF_PRESETS[index];

    var btns = presetBtnsContainer.querySelectorAll('.preset-btn');
    btns.forEach(function (b, i) { b.classList.toggle('active', i === index); });

    events = AlgoVis.runBellmanFord(currentPreset.n, currentPreset.edges, currentPreset.source);
    if (player) player.pause();
    player = AlgoVis.createPlayer(events, onEvent);
  }

  // ---- Event handler ----
  var lastEvent = null;

  function onEvent(evt, index) {
    lastEvent = { evt: evt, index: index };

    renderGraph(evt);
    updateDPTable(index);
    updateEdgeList(evt);
    updateStepInfo(evt);
    updateRoundDisplay(evt);
    updatePseudocode(evt);
    updateCounters(index);
  }

  // ---- Directed graph rendering ----
  function renderGraph(evt) {
    var p = currentPreset;
    var distSnap = evt.distSnapshot || null;

    var vertices = [];
    for (var i = 0; i < p.n; i++) {
      var state = 'default';
      if (evt.type === 'init' && i === p.source) state = 'active';
      if ((evt.type === 'relax' || evt.type === 'relax-fail') && (i === evt.from || i === evt.to)) state = 'active';
      if (evt.type === 'negative-cycle-check' && (i === evt.from || i === evt.to)) state = 'active';
      if (evt.type === 'done' && !evt.negativeCycle) state = 'finalized';

      vertices.push({
        id: i, label: p.labels[i],
        x: p.positions[i].x, y: p.positions[i].y,
        state: state
      });
    }

    var edgeConfigs = [];
    p.edges.forEach(function (e, idx) {
      var eState = 'default';
      if (e[2] < 0) eState = 'negative';

      if ((evt.type === 'relax' || evt.type === 'relax-fail') && evt.edgeIndex === idx) {
        eState = evt.success ? 'relaxing' : 'relaxFail';
      }
      if (evt.type === 'negative-cycle-check' && evt.edgeIndex === idx) {
        eState = evt.improved ? 'relaxFail' : 'considering';
      }

      edgeConfigs.push({ u: e[0], v: e[1], w: e[2], state: eState });
    });

    var distLabels = {};
    if (distSnap) {
      for (var i = 0; i < p.n; i++) {
        distLabels[i] = distSnap[i] === Infinity ? '\u221E' : String(distSnap[i]);
      }
    }

    AlgoVis.renderGraph(canvas, {
      vertices: vertices,
      edges: edgeConfigs,
      distLabels: distLabels,
      directed: true
    });
  }

  // ---- DP Table: D[v, k] ----
  function updateDPTable(currentIndex) {
    var p = currentPreset;
    var n = p.n;
    var container = document.getElementById('dpTableContainer');

    // Collect round snapshots up to current index
    var roundDists = []; // roundDists[k] = dist[] after round k
    // Round 0 = initial (source=0, rest=INF)
    var initDist = Array(n).fill(Infinity);
    initDist[p.source] = 0;
    roundDists.push(initDist);

    // Find current round and current processing state
    var currentRound = 0;
    var currentEdgeIdx = -1;
    var currentEvt = events[currentIndex];

    for (var i = 0; i <= currentIndex; i++) {
      var ev = events[i];
      if (ev.type === 'round-end') {
        roundDists.push([].concat(ev.distSnapshot));
        currentRound = ev.round;
      }
    }

    // If we're mid-round, add a partial row
    var inMidRound = false;
    if (currentEvt.type === 'relax' || currentEvt.type === 'relax-fail' || currentEvt.type === 'round-start') {
      var midRound = currentEvt.round || findRound(currentIndex);
      if (midRound > roundDists.length - 1) {
        roundDists.push([].concat(currentEvt.distSnapshot));
        inMidRound = true;
        currentRound = midRound;
      } else {
        // Update the last row with current snapshot
        roundDists[roundDists.length - 1] = [].concat(currentEvt.distSnapshot);
        inMidRound = true;
        currentRound = midRound;
      }
      currentEdgeIdx = currentEvt.edgeIndex !== undefined ? currentEvt.edgeIndex : -1;
    }

    // Total rounds for the header
    var totalRounds = n - 1;

    // Build HTML table
    var html = '<table class="bf-dp-table">';

    // Header: vertex | k=0 | k=1 | ... | k=n-1
    html += '<thead><tr><th>Vertex</th>';
    for (var k = 0; k < roundDists.length; k++) {
      var isActive = inMidRound && k === roundDists.length - 1;
      html += '<th class="' + (isActive ? 'round-header' : '') + '">k=' + k + '</th>';
    }
    // Show future columns grayed out
    for (var k = roundDists.length; k <= totalRounds; k++) {
      html += '<th style="color:#333;">k=' + k + '</th>';
    }
    html += '</tr></thead>';

    // Body: one row per vertex
    html += '<tbody>';
    for (var v = 0; v < n; v++) {
      html += '<tr>';
      html += '<td class="vertex-label">' + p.labels[v] + '</td>';

      for (var k = 0; k < roundDists.length; k++) {
        var val = roundDists[k][v];
        var valStr = val === Infinity ? '\u221E' : val;
        var cls = '';

        // Last column and mid-round: highlight the vertex being updated
        if (inMidRound && k === roundDists.length - 1) {
          cls = 'current-round';
          if (currentEvt.type === 'relax' && currentEvt.to === v) {
            cls = 'updated';
          }
          if ((currentEvt.type === 'relax' || currentEvt.type === 'relax-fail') && currentEvt.to === v) {
            cls = currentEvt.success ? 'updated' : 'computing';
          }
        }

        // Check if value changed from previous round
        if (k > 0 && !inMidRound || (k > 0 && k < roundDists.length - 1)) {
          if (roundDists[k][v] !== roundDists[k - 1][v]) {
            if (!cls) cls = 'updated';
          }
        }

        html += '<td class="' + cls + '">' + valStr + '</td>';
      }

      // Future columns
      for (var k = roundDists.length; k <= totalRounds; k++) {
        html += '<td class="future">-</td>';
      }

      html += '</tr>';
    }
    html += '</tbody></table>';

    container.innerHTML = html;
  }

  function findRound(index) {
    for (var i = index; i >= 0; i--) {
      if (events[i].round !== undefined) return events[i].round;
      if (events[i].type === 'round-start') return events[i].round;
    }
    return 0;
  }

  // ---- Edge List ----
  function updateEdgeList(evt) {
    var el = document.getElementById('edgeList');
    var p = currentPreset;
    var html = '';

    p.edges.forEach(function (e, idx) {
      var cls = 'edge-item';
      if ((evt.type === 'relax' || evt.type === 'relax-fail') && evt.edgeIndex === idx) {
        cls += evt.success ? ' success-edge' : ' fail-edge';
      } else if ((evt.type === 'relax' || evt.type === 'relax-fail') && evt.edgeIndex > idx) {
        // Already processed this round — dim it
        cls += '';
      }
      if (evt.type === 'negative-cycle-check' && evt.edgeIndex === idx) {
        cls += evt.improved ? ' fail-edge' : ' active-edge';
      }

      var wStr = e[2] < 0 ? '<span class="neg-weight">' + e[2] + '</span>' : String(e[2]);
      html += '<div class="' + cls + '">';
      html += '<span>' + p.labels[e[0]] + ' &rarr; ' + p.labels[e[1]] + '</span>';
      html += '<span>w=' + wStr + '</span>';
      html += '</div>';
    });

    el.innerHTML = html;
  }

  // ---- Step Info ----
  function updateStepInfo(evt) {
    var el = document.getElementById('stepInfo');
    var p = currentPreset;
    var labels = p.labels;
    var html = '';

    if (evt.type === 'init') {
      html = '<div class="step-title">Ready</div>';
      html += 'Source: <span class="highlight">' + labels[evt.source] + '</span> (d=0).<br>';
      html += 'Click <strong>Step Forward</strong> to begin.<br><br>';
      html += '<strong>DP recurrence:</strong><br>';
      html += '<span style="font-family:monospace;font-size:0.85rem;">D[v,k] = min(D[v,k-1], min<sub>(u,v)&isin;E</sub> D[u,k-1]+w(u,v))</span>';

    } else if (evt.type === 'round-start') {
      html = '<div class="step-title">Round ' + evt.round + ' starting</div>';
      html += 'Will relax all ' + p.edges.length + ' directed edges.';

    } else if (evt.type === 'relax' || evt.type === 'relax-fail') {
      var fromL = labels[evt.from], toL = labels[evt.to];
      html = '<div class="step-title">Edge ' + (evt.edgeIndex + 1) + '/' + p.edges.length + ': ' + fromL + ' &rarr; ' + toL + '</div>';
      var oldStr = evt.oldDist === Infinity ? '\u221E' : evt.oldDist;
      var newStr = evt.newDist === Infinity ? '\u221E' : evt.newDist;
      var resultClass = evt.success ? 'relax-success' : 'relax-fail';
      var resultText = evt.success ? 'UPDATED' : 'NO CHANGE';
      html += '<div class="relax-detail ' + resultClass + '">';
      html += 'd[' + fromL + '] + w(' + fromL + ',' + toL + ')<br>';
      html += '= ' + (evt.distSnapshot[evt.from] === Infinity ? '\u221E' : (evt.distSnapshot[evt.from] - (evt.success ? 0 : 0))) + ' + (' + evt.weight + ') = ' + newStr + '<br>';
      html += 'vs d[' + toL + '] = ' + oldStr + '<br>';
      html += '<strong>&rarr; ' + resultText + '</strong>';
      html += '</div>';
      if (evt.weight < 0) {
        html += '<div style="color:#f87171;font-size:0.82rem;margin-top:6px;">Negative weight edge! Dijkstra can\'t handle this.</div>';
      }

    } else if (evt.type === 'round-end') {
      html = '<div class="step-title">Round ' + evt.round + ' complete</div>';
      html += evt.anyUpdate
        ? 'Distances were updated this round.'
        : '<span style="color:#4ade80;">No updates &mdash; converged early!</span>';

    } else if (evt.type === 'negative-cycle-check') {
      html = '<div class="step-title">Cycle Check: ' + labels[evt.from] + ' &rarr; ' + labels[evt.to] + '</div>';
      html += evt.improved
        ? '<div class="relax-detail relax-fail">Can still improve &mdash; <strong>negative cycle exists!</strong></div>'
        : '<div class="relax-detail">No improvement. OK.</div>';

    } else if (evt.type === 'done') {
      var rc = 0, sc = 0;
      for (var k = 0; k < events.length; k++) {
        if (events[k].type === 'relax' || events[k].type === 'relax-fail') rc++;
        if (events[k].type === 'relax') sc++;
      }
      html = '<div class="step-title">Complete!</div>';
      html += '<span class="highlight">' + rc + '</span> relaxations, <span class="highlight">' + sc + '</span> successful.<br><br>';
      if (evt.negativeCycle) {
        html += '<div style="background:#3a1a1a; border:1px solid #f87171; border-radius:8px; padding:12px;">';
        html += '<strong style="color:#f87171;">Negative cycle detected!</strong><br>';
        html += 'After n-1 rounds, distances can still be improved. This means a negative-weight cycle is reachable from the source.';
        html += '</div>';
      } else {
        html += '<div style="color:#4ade80;">All shortest paths found correctly.</div>';
      }
    }

    el.innerHTML = html;
  }

  // ---- Round Display ----
  function updateRoundDisplay(evt) {
    var el = document.getElementById('roundDisplay');
    var n = currentPreset.n;
    if (evt.type === 'init') {
      el.innerHTML = 'k=0<span class="sub">initial distances</span>';
    } else if (evt.type === 'round-start' || evt.type === 'relax' || evt.type === 'relax-fail') {
      var r = evt.round || findRound(lastEvent.index);
      el.innerHTML = 'k=' + r + '<span class="sub">of ' + (n - 1) + ' rounds</span>';
    } else if (evt.type === 'round-end') {
      el.innerHTML = 'k=' + evt.round + '<span class="sub">' + (evt.anyUpdate ? 'updated' : 'no change') + '</span>';
    } else if (evt.type === 'negative-cycle-check') {
      el.innerHTML = 'k=n<span class="sub">cycle detection</span>';
    } else if (evt.type === 'done') {
      el.innerHTML = 'Done<span class="sub">' + (evt.negativeCycle ? 'NEGATIVE CYCLE' : 'converged') + '</span>';
    }
  }

  // ---- Pseudocode highlighting ----
  function updatePseudocode(evt) {
    var lines = document.querySelectorAll('#pseudocode .line');
    var active = -1;
    if (evt.type === 'init') active = 2;
    else if (evt.type === 'round-start') active = 3;
    else if (evt.type === 'relax') active = 6;
    else if (evt.type === 'relax-fail') active = 5;
    else if (evt.type === 'round-end') active = 3;
    else if (evt.type === 'negative-cycle-check') active = 10;
    else if (evt.type === 'done') active = 11;

    lines.forEach(function (line) {
      var ln = parseInt(line.getAttribute('data-line'), 10);
      line.classList.toggle('active', ln === active);
    });
  }

  // ---- Counters (recomputed — supports step-back) ----
  function updateCounters(index) {
    var rt = 0, rs = 0;
    for (var k = 0; k <= index; k++) {
      var t = events[k].type;
      if (t === 'relax' || t === 'relax-fail') rt++;
      if (t === 'relax') rs++;
    }
    document.getElementById('relaxCount').textContent = rt;
    document.getElementById('successCount').textContent = rs;
  }

  // ---- Resize ----
  window.addEventListener('resize', function () {
    if (lastEvent) onEvent(lastEvent.evt, lastEvent.index);
  });

  // ---- Init ----
  loadPreset(0);
})();
