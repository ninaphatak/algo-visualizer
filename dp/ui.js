/* ============================================
   CS 141 Algorithm Visualizer — DP UI Controller
   ============================================ */

(function () {
  var activeTab = 'knapsack01';
  var player = null;
  var events = [];
  var rowLabels = [];
  var colLabels = [];
  var cellStates = [];   // cellStates[r][c] = { value, state }
  var filledSet = {};     // track which cells have been filled

  var tableContainer = document.getElementById('tableContainer');
  var formulaBar     = document.getElementById('formulaBar');
  var stepInfo       = document.getElementById('stepInfo');
  var decisionInfo   = document.getElementById('decisionInfo');
  var pseudocodeEl   = document.getElementById('pseudocode');

  // Pseudocode definitions
  var PSEUDOCODES = {
    knapsack01: [
      'Knapsack-01(items, W):',
      '  DP[i][j] = 0 for all base cases',
      '  for i = 1 to n:',
      '    for j = 0 to W:',
      '      DP[i][j] = DP[i-1][j]          // skip',
      '      if j >= w[i]:',
      '        DP[i][j] = max(DP[i][j],',
      '          DP[i-1][j-w[i]] + v[i])    // take',
      '  // Uses DP[i-1]: each item at most once',
      '  return DP[n][W]'
    ],
    knapsackUnbounded: [
      'Knapsack-Unbounded(items, W):',
      '  s[0] = 0',
      '  for w = 1 to W:',
      '    for each item (wj, vj):',
      '      if w >= wj:',
      '        s[w] = max(s[w], s[w-wj]+vj)',
      '  // Uses s[w-wj]: items are reusable',
      '  return s[W]'
    ],
    lcs: [
      'LCS(X, Y):',
      '  LCS[i][0] = 0, LCS[0][j] = 0',
      '  for i = 1 to m:',
      '    for j = 1 to n:',
      '      if X[i] == Y[j]:',
      '        LCS[i][j] = LCS[i-1][j-1] + 1',
      '      else:',
      '        LCS[i][j] = max(LCS[i-1][j],',
      '                        LCS[i][j-1])',
      '  return LCS[m][n]'
    ],
    lis: [
      'LIS(A):',
      '  dp[i] = 1 for all i',
      '  for i = 1 to n:',
      '    for j = 1 to i-1:',
      '      if A[j] < A[i]:',
      '        dp[i] = max(dp[i], dp[j]+1)',
      '  return max(dp[1..n])'
    ],
    editDistance: [
      'EditDistance(X, Y):',
      '  ed[i][0] = i, ed[0][j] = j',
      '  for i = 1 to m:',
      '    for j = 1 to n:',
      '      if X[i] == Y[j]:',
      '        ed[i][j] = ed[i-1][j-1]',
      '      else:',
      '        ed[i][j] = 1 + min(',
      '          ed[i-1][j],    // delete',
      '          ed[i][j-1],    // insert',
      '          ed[i-1][j-1])  // replace',
      '  return ed[m][n]'
    ]
  };

  function setPseudocode(algo) {
    var lines = PSEUDOCODES[algo] || [];
    var html = '';
    for (var i = 0; i < lines.length; i++) {
      html += '<div class="line" data-line="' + i + '">' + escapeHtml(lines[i]) + '</div>';
    }
    pseudocodeEl.innerHTML = html;
  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function initCellStates(rows, cols) {
    rowLabels = rows;
    colLabels = cols;
    cellStates = [];
    filledSet = {};
    for (var r = 0; r < rows.length; r++) {
      cellStates[r] = [];
      for (var c = 0; c < cols.length; c++) {
        cellStates[r][c] = { value: '', state: 'empty' };
      }
    }
  }

  function cellKey(r, c) {
    return r + ',' + c;
  }

  function renderCurrentState(evt) {
    // Build cells with current states — reset highlights first
    for (var r = 0; r < rowLabels.length; r++) {
      for (var c = 0; c < colLabels.length; c++) {
        if (cellStates[r][c].state === 'computing' || cellStates[r][c].state === 'dependency') {
          cellStates[r][c].state = filledSet[cellKey(r, c)] ? 'filled' : 'empty';
        }
      }
    }

    if (evt && evt.type === 'fill-cell') {
      // Mark dependencies
      if (evt.deps) {
        for (var d = 0; d < evt.deps.length; d++) {
          var dep = evt.deps[d];
          if (dep.row >= 0 && dep.row < rowLabels.length && dep.col >= 0 && dep.col < colLabels.length) {
            cellStates[dep.row][dep.col].state = 'dependency';
          }
        }
      }

      // Mark current cell
      cellStates[evt.row][evt.col].value = evt.value;
      cellStates[evt.row][evt.col].state = 'computing';
      filledSet[cellKey(evt.row, evt.col)] = true;
    }

    AlgoVis.renderTable(tableContainer, {
      rows: rowLabels,
      cols: colLabels,
      cells: cellStates,
      formula: ''
    });
  }

  function onEvent(evt, index) {
    if (evt.type === 'init') {
      initCellStates(evt.rows, evt.cols);
      renderCurrentState(null);
      formulaBar.textContent = '—';
      stepInfo.textContent = 'Step ' + index + ': Initialized table (' + evt.rows.length + ' rows x ' + evt.cols.length + ' cols)';
      decisionInfo.textContent = '—';
    } else if (evt.type === 'fill-cell') {
      renderCurrentState(evt);
      formulaBar.textContent = evt.formula || '—';
      stepInfo.innerHTML = '<span class="step-title">Step ' + index + '</span><br>Filling cell [' + evt.row + '][' + evt.col + '] = <span class="highlight">' + evt.value + '</span>';
      decisionInfo.textContent = evt.decision || '—';
    } else if (evt.type === 'done') {
      // Clear highlights, show all filled
      for (var r = 0; r < rowLabels.length; r++) {
        for (var c = 0; c < colLabels.length; c++) {
          if (filledSet[cellKey(r, c)]) {
            cellStates[r][c].state = 'filled';
          }
        }
      }
      AlgoVis.renderTable(tableContainer, {
        rows: rowLabels,
        cols: colLabels,
        cells: cellStates,
        formula: ''
      });
      formulaBar.textContent = 'Answer: ' + evt.answer;
      stepInfo.innerHTML = '<span class="step-title">Done!</span><br>Optimal value = <span class="highlight">' + evt.answer + '</span>';
      decisionInfo.textContent = 'Algorithm complete.';
    }
  }

  function runAlgorithm(algo) {
    var presets = AlgoVis.DP_PRESETS;
    var preset = presets[algo];

    switch (algo) {
      case 'knapsack01':
        events = AlgoVis.runKnapsack01(preset.items, preset.W);
        break;
      case 'knapsackUnbounded':
        events = AlgoVis.runKnapsackUnbounded(preset.items, preset.W);
        break;
      case 'lcs':
        events = AlgoVis.runLCS(preset.X, preset.Y);
        break;
      case 'lis':
        events = AlgoVis.runLIS(preset.A);
        break;
      case 'editDistance':
        events = AlgoVis.runEditDistance(preset.X, preset.Y);
        break;
    }

    setPseudocode(algo);

    // Create new player (re-binds buttons)
    player = AlgoVis.createPlayer(events, onEvent);
  }

  // Tab switching
  var tabs = document.querySelectorAll('#algoTabs .tab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener('click', function () {
      // Remove active from all
      for (var j = 0; j < tabs.length; j++) {
        tabs[j].classList.remove('active');
      }
      this.classList.add('active');
      activeTab = this.getAttribute('data-algo');
      runAlgorithm(activeTab);
    });
  }

  // Initial load
  runAlgorithm(activeTab);
})();
