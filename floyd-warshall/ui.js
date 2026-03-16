/* ============================================
   CS 141 Algorithm Visualizer — Floyd-Warshall UI
   ============================================ */

(function () {
  var presets = AlgoVis.GRAPH_PRESETS;
  var currentPreset = null;
  var player = null;
  var labels = [];

  var graphCanvas   = document.getElementById('graphCanvas');
  var matrixContainer = document.getElementById('matrixContainer');
  var stepInfo      = document.getElementById('stepInfo');
  var phaseDisplay  = document.getElementById('phaseDisplay');
  var formulaBar    = document.getElementById('formulaBar');
  var presetBtns    = document.getElementById('presetBtns');
  var pseudocode    = document.getElementById('pseudocode');

  var INF = Infinity;

  // --- Preset buttons ---
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
    labels = currentPreset.labels;

    // Update active button
    var btns = presetBtns.querySelectorAll('.preset-btn');
    btns.forEach(function (b, i) {
      b.classList.toggle('active', i === idx);
    });

    // Run algorithm
    var events = AlgoVis.runFloydWarshall(currentPreset.n, currentPreset.edges);

    // Create player
    if (player) player.pause();
    player = AlgoVis.createPlayer(events, onEvent);
  }

  function fmtVal(v) {
    return v === INF ? '\u221e' : String(v);
  }

  // Build graph config with optional path highlighting for update events
  // evt can be null (just show graph) or an update event (show i→k→j vs i→j)
  function buildGraphConfig(preset, activeK, evt) {
    var n = preset.n;
    var vertices = [];
    for (var i = 0; i < n; i++) {
      var state = 'default';
      if (i === activeK) state = 'active';
      // On update events, highlight i and j vertices
      if (evt && evt.type === 'update') {
        if (i === evt.i || i === evt.j) state = 'finalized'; // green = endpoints
        if (i === evt.k) state = 'active'; // blue = intermediate
      }
      vertices.push({
        id: i,
        label: preset.labels[i],
        x: preset.positions[i].x,
        y: preset.positions[i].y,
        state: state
      });
    }

    var edges = [];
    preset.edges.forEach(function (e) {
      edges.push({ u: e[0], v: e[1], w: e[2], state: 'default' });
    });

    // On update events, add overlay edges showing the paths being compared
    if (evt && evt.type === 'update') {
      var matrix = evt.matrix;
      var ii = evt.i, jj = evt.j, kk = evt.k;

      // Direct path i→j (yellow = what we currently have)
      if (evt.oldVal !== INF) {
        edges.push({ u: ii, v: jj, w: evt.oldVal, state: 'relaxing' });
      }

      // Path through k: i→k (blue) and k→j (blue)
      var dik = matrix[ii] ? matrix[ii][kk] : INF;
      var dkj = matrix[kk] ? matrix[kk][jj] : INF;
      // Use the values from before this update for i→k and k→j
      if (dik !== INF) {
        edges.push({ u: ii, v: kk, w: dik, state: 'considering' });
      }
      if (dkj !== INF) {
        edges.push({ u: kk, v: jj, w: dkj, state: 'considering' });
      }
    }

    // Distance labels from current matrix if available
    var distLabels = {};
    if (evt && evt.type === 'done' && evt.matrix) {
      // On done, don't show per-vertex labels (it's all-pairs, not single-source)
    }

    return { vertices: vertices, edges: edges, distLabels: distLabels };
  }

  function renderMatrix(matrix, currentI, currentJ, k) {
    var n = matrix.length;
    var rows = labels.slice();
    var cols = labels.slice();
    var cells = [];

    for (var r = 0; r < n; r++) {
      cells[r] = [];
      for (var c = 0; c < n; c++) {
        var val = fmtVal(matrix[r][c]);
        var state = 'filled';

        if (currentI !== undefined && currentJ !== undefined) {
          if (r === currentI && c === currentJ) {
            state = 'computing';
          } else if (k !== undefined && ((r === currentI && c === k) || (r === k && c === currentJ))) {
            state = 'dependency';
          }
        }

        if (matrix[r][c] === INF) {
          state = (state === 'filled') ? 'empty' : state;
        }

        cells[r][c] = { value: val, state: state };
      }
    }

    AlgoVis.renderTable(matrixContainer, {
      rows: rows,
      cols: cols,
      cells: cells
    });
  }

  function highlightPseudoLine(lineNum) {
    var lines = pseudocode.querySelectorAll('.line');
    lines.forEach(function (el) {
      el.classList.toggle('active', parseInt(el.getAttribute('data-line'), 10) === lineNum);
    });
  }

  function onEvent(evt, idx) {
    if (!currentPreset) return;

    switch (evt.type) {
      case 'init':
        phaseDisplay.textContent = 'Initialization';
        formulaBar.textContent = 'd[i][j] = w(i,j) or \u221e; d[v][v] = 0';
        stepInfo.innerHTML = '<div class="step-title">Distance matrix initialized</div>' +
          'Direct edge weights filled in. Missing edges set to \u221e. Diagonal set to 0.';
        renderMatrix(evt.matrix);
        AlgoVis.renderGraph(graphCanvas, buildGraphConfig(currentPreset, -1));
        highlightPseudoLine(1);
        break;

      case 'phase-start':
        phaseDisplay.textContent = 'Phase k=' + evt.k + ': intermediate vertex = ' + labels[evt.k];
        stepInfo.innerHTML = '<div class="step-title">Starting Phase k=' + evt.k + '</div>' +
          'Now checking all pairs (i,j) to see if routing through <span class="highlight">' +
          labels[evt.k] + '</span> gives a shorter path.';
        formulaBar.textContent = 'd[i][j] = min(d[i][j], d[i][' + evt.k + '] + d[' + evt.k + '][j])';
        AlgoVis.renderGraph(graphCanvas, buildGraphConfig(currentPreset, evt.k));
        highlightPseudoLine(3);
        break;

      case 'update':
        var iLabel = labels[evt.i];
        var jLabel = labels[evt.j];
        var kLabel = labels[evt.k];

        formulaBar.textContent = 'd[' + iLabel + '][' + jLabel + '] = min(d[' + iLabel + '][' + jLabel + '], d[' +
          iLabel + '][' + kLabel + '] + d[' + kLabel + '][' + jLabel + ']) = min(' +
          fmtVal(evt.oldVal) + ', ' + fmtVal(evt.throughK) + ') = ' + fmtVal(evt.newVal);

        var resultClass = evt.improved ? 'relax-success' : 'relax-fail';
        var resultText = evt.improved ? 'IMPROVED' : 'NO CHANGE';

        stepInfo.innerHTML = '<div class="step-title">Phase k=' + evt.k +
          ': Checking (' + iLabel + ', ' + jLabel + ')</div>' +
          'Checking if path ' + iLabel + ' \u2192 ' + kLabel + ' \u2192 ' + jLabel + ' is shorter.<br>' +
          'd[' + iLabel + '][' + kLabel + '] + d[' + kLabel + '][' + jLabel + '] = ' +
          fmtVal(evt.throughK) + ' vs d[' + iLabel + '][' + jLabel + '] = ' + fmtVal(evt.oldVal) +
          '<div class="relax-detail ' + resultClass + '">' + resultText + '</div>';

        renderMatrix(evt.matrix, evt.i, evt.j, evt.k);
        AlgoVis.renderGraph(graphCanvas, buildGraphConfig(currentPreset, evt.k, evt));
        highlightPseudoLine(6);
        break;

      case 'phase-end':
        phaseDisplay.textContent = 'Phase k=' + evt.k + ' complete';
        stepInfo.innerHTML = '<div class="step-title">Phase k=' + evt.k + ' complete</div>' +
          'All pairs checked with <span class="highlight">' + labels[evt.k] +
          '</span> as intermediate vertex.';
        renderMatrix(evt.matrix);
        AlgoVis.renderGraph(graphCanvas, buildGraphConfig(currentPreset, evt.k));
        highlightPseudoLine(3);
        break;

      case 'done':
        phaseDisplay.textContent = 'Algorithm Complete';
        formulaBar.textContent = 'All-pairs shortest paths computed.';
        stepInfo.innerHTML = '<div class="step-title">Floyd-Warshall Complete</div>' +
          'The distance matrix now contains shortest path distances between all pairs of vertices.';
        renderMatrix(evt.matrix);
        AlgoVis.renderGraph(graphCanvas, buildGraphConfig(currentPreset, -1));
        highlightPseudoLine(8);
        break;
    }
  }

  // Auto-load first preset
  loadPreset(0);
})();
