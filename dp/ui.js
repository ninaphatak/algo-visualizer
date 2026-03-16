/* ============================================
   CS 141 — DP Explorer UI
   Problem statements, input display, live recurrence, dependency highlighting
   ============================================ */

(function () {
  'use strict';

  var activeTab = 'knapsack01';
  var player = null;
  var events = [];
  var rowLabels = [];
  var colLabels = [];
  var cellStates = [];
  var filledSet = {};

  var tableContainer = document.getElementById('tableContainer');
  var problemBox = document.getElementById('problemBox');
  var inputDisplay = document.getElementById('inputDisplay');
  var recurrenceBox = document.getElementById('recurrenceBox');
  var stepInfo = document.getElementById('stepInfo');
  var pseudocodeEl = document.getElementById('pseudocode');

  // ---- Problem statements ----
  var PROBLEMS = {
    knapsack01: {
      title: '0/1 Knapsack',
      desc: function (p) {
        return 'Given <strong>' + p.items.length + ' items</strong> each with a weight and value, ' +
          'find the subset with <strong>maximum total value</strong> that fits in a knapsack of capacity <strong>W=' + p.W + '</strong>. ' +
          'Each item can be used <strong>at most once</strong>.';
      },
      input: function (p) {
        var html = '<table class="items-table"><thead><tr><th>Item</th><th>Weight</th><th>Value</th></tr></thead><tbody>';
        p.items.forEach(function (item) {
          html += '<tr><td>' + item.name + '</td><td>' + item.w + '</td><td>' + item.v + '</td></tr>';
        });
        html += '</tbody></table>';
        html += '<div style="margin-top:6px;color:#888;font-size:0.8rem;">Capacity W = ' + p.W + '</div>';
        return html;
      },
      state: 'DP[i][j] = max value using items 1..i with capacity j',
      recurrenceTemplate: 'DP[i][j] = max(<span class="skip-val">DP[i-1][j]</span>, <span class="take-val">DP[i-1][j-w<sub>i</sub>] + v<sub>i</sub></span>)',
      note: 'Uses DP[<strong>i-1</strong>] (previous row) &mdash; each item at most once.'
    },
    knapsackUnbounded: {
      title: 'Unbounded Knapsack',
      desc: function (p) {
        return 'Given <strong>' + p.items.length + ' item types</strong>, find the combination with <strong>maximum total value</strong> ' +
          'that fits in capacity <strong>W=' + p.W + '</strong>. Each item can be used <strong>unlimited times</strong>.';
      },
      input: function (p) {
        var html = '<table class="items-table"><thead><tr><th>Item</th><th>Weight</th><th>Value</th></tr></thead><tbody>';
        p.items.forEach(function (item) {
          html += '<tr><td>' + item.name + '</td><td>' + item.w + '</td><td>' + item.v + '</td></tr>';
        });
        html += '</tbody></table>';
        html += '<div style="margin-top:6px;color:#888;font-size:0.8rem;">Capacity W = ' + p.W + '</div>';
        return html;
      },
      state: 's[w] = max value with capacity w (items reusable)',
      recurrenceTemplate: 's[w] = max over all items j: <span class="take-val">s[w-w<sub>j</sub>] + v<sub>j</sub></span>',
      note: 'Uses s[w-w<sub>j</sub>] (<strong>same</strong> array) &mdash; items reusable.'
    },
    lcs: {
      title: 'Longest Common Subsequence',
      desc: function (p) {
        return 'Find the <strong>longest subsequence</strong> common to both strings ' +
          '<strong>"' + p.X + '"</strong> and <strong>"' + p.Y + '"</strong>.';
      },
      input: function (p) {
        return '<div class="input-display">' +
          '<div style="margin-bottom:4px;color:#888;">X:</div>' + charBoxes(p.X) +
          '<div style="margin-top:8px;margin-bottom:4px;color:#888;">Y:</div>' + charBoxes(p.Y) +
          '</div>';
      },
      state: 'LCS[i][j] = LCS length of X[1..i] and Y[1..j]',
      recurrenceTemplate: 'If X[i]=Y[j]: <span class="take-val">LCS[i-1][j-1] + 1</span><br>Else: max(<span class="skip-val">LCS[i-1][j]</span>, <span class="skip-val">LCS[i][j-1]</span>)',
      note: 'Match &rarr; diagonal +1. No match &rarr; best of skip X[i] or skip Y[j].'
    },
    lis: {
      title: 'Longest Increasing Subsequence',
      desc: function (p) {
        return 'Find the <strong>longest subsequence</strong> of the sequence where each element is <strong>strictly greater</strong> than the previous.';
      },
      input: function (p) {
        return '<div class="input-display">' +
          '<div style="margin-bottom:4px;color:#888;">Sequence A:</div>' +
          charBoxes(p.A.join(','), p.A) +
          '</div>';
      },
      state: 'dp[i] = LIS length ending at position i',
      recurrenceTemplate: 'dp[i] = max(1, max<sub>j&lt;i, A[j]&lt;A[i]</sub> <span class="take-val">dp[j] + 1</span>)',
      note: 'For each i, check all previous j where A[j] &lt; A[i] as potential "second-to-last" element.'
    },
    editDistance: {
      title: 'Edit Distance',
      desc: function (p) {
        return 'Find the <strong>minimum number of operations</strong> (insert, delete, replace) to transform ' +
          '<strong>"' + p.X + '"</strong> into <strong>"' + p.Y + '"</strong>.';
      },
      input: function (p) {
        return '<div class="input-display">' +
          '<div style="margin-bottom:4px;color:#888;">Source X:</div>' + charBoxes(p.X) +
          '<div style="margin-top:8px;margin-bottom:4px;color:#888;">Target Y:</div>' + charBoxes(p.Y) +
          '</div>';
      },
      state: 'ed[i][j] = min edits to transform X[1..i] into Y[1..j]',
      recurrenceTemplate: 'If X[i]=Y[j]: <span class="take-val">ed[i-1][j-1]</span> (free)<br>Else: 1 + min(<span class="skip-val">ed[i-1][j]</span><sub>del</sub>, <span class="skip-val">ed[i][j-1]</span><sub>ins</sub>, <span class="skip-val">ed[i-1][j-1]</span><sub>rep</sub>)',
      note: 'Match &rarr; free. Otherwise cheapest of delete, insert, or replace.'
    }
  };

  function charBoxes(str, arr) {
    var items = arr || str.split('');
    var html = '';
    for (var i = 0; i < items.length; i++) {
      html += '<span class="char-box">' + items[i] + '</span>';
    }
    return html;
  }

  // ---- Pseudocode ----
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
      '  return DP[n][W]'
    ],
    knapsackUnbounded: [
      'Knapsack-Unbounded(items, W):',
      '  s[0] = 0',
      '  for w = 1 to W:',
      '    for each item (wj, vj):',
      '      if w >= wj:',
      '        s[w] = max(s[w], s[w-wj]+vj)',
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
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ---- Problem & input display ----
  function showProblem(algo) {
    var preset = AlgoVis.DP_PRESETS[algo];
    var prob = PROBLEMS[algo];

    // Problem box
    problemBox.innerHTML = '<div class="problem-title">' + prob.title + '</div>' +
      prob.desc(preset) +
      '<div style="margin-top:8px;color:#888;font-size:0.82rem;"><strong>State:</strong> ' + prob.state + '</div>' +
      '<div style="margin-top:4px;font-size:0.82rem;">' + prob.note + '</div>';

    // Input display
    inputDisplay.innerHTML = prob.input(preset);

    // Recurrence template — will be rendered by showLiveRecurrence on init event
    recurrenceBox.innerHTML = prob.recurrenceTemplate || '&mdash;';
  }

  // ---- Table state management ----
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

  function cellKey(r, c) { return r + ',' + c; }

  // Rebuild cell states by replaying events 0..index (supports step-back)
  function rebuildState(index) {
    // Reset
    for (var r = 0; r < rowLabels.length; r++) {
      for (var c = 0; c < colLabels.length; c++) {
        cellStates[r][c] = { value: '', state: 'empty' };
      }
    }
    filledSet = {};

    // Replay all fill-cell events up to index
    for (var i = 0; i <= index; i++) {
      var ev = events[i];
      if (ev.type === 'fill-cell') {
        cellStates[ev.row][ev.col].value = ev.value;
        cellStates[ev.row][ev.col].state = 'filled';
        filledSet[cellKey(ev.row, ev.col)] = true;
      }
    }

    // Now apply highlighting for the current event
    var evt = events[index];
    if (evt && evt.type === 'fill-cell') {
      // Mark dependencies FIRST (yellow)
      if (evt.deps) {
        for (var d = 0; d < evt.deps.length; d++) {
          var dep = evt.deps[d];
          if (dep.row >= 0 && dep.row < rowLabels.length && dep.col >= 0 && dep.col < colLabels.length) {
            cellStates[dep.row][dep.col].state = 'dependency';
          }
        }
      }
      // Mark current cell (blue) — overwrites if it was also a dep
      cellStates[evt.row][evt.col].state = 'computing';
    }
  }

  function renderTable() {
    AlgoVis.renderTable(tableContainer, {
      rows: rowLabels,
      cols: colLabels,
      cells: cellStates,
      formula: ''
    });
  }

  // ---- Live recurrence with KaTeX math rendering ----
  function renderKatex(latex, el) {
    if (typeof katex !== 'undefined') {
      try { katex.render(latex, el, { displayMode: true, throwOnError: false }); return; }
      catch (e) { /* fallback */ }
    }
    // Fallback if KaTeX not loaded yet
    el.textContent = latex;
  }

  function showLiveRecurrence(evt) {
    if (!evt || evt.type !== 'fill-cell') {
      // Show the general recurrence template in KaTeX
      var templates = {
        knapsack01: 'DP[i][j] = \\max\\bigl(\\underbrace{DP[i\\!-\\!1][j]}_{\\color{#fbbf24}\\text{skip}},\\; \\underbrace{DP[i\\!-\\!1][j\\!-\\!w_i] + v_i}_{\\color{#4ade80}\\text{take}}\\bigr)',
        knapsackUnbounded: 's[w] = \\max_{\\text{item } j} \\bigl(\\underbrace{s[w - w_j] + v_j}_{\\color{#4ade80}\\text{use item } j}\\bigr)',
        lcs: 'LCS[i][j] = \\begin{cases} \\color{#4ade80}{LCS[i\\!-\\!1][j\\!-\\!1] + 1} & \\text{if } X[i] = Y[j] \\\\ \\max(\\color{#fbbf24}{LCS[i\\!-\\!1][j]},\\; \\color{#fbbf24}{LCS[i][j\\!-\\!1]}) & \\text{otherwise} \\end{cases}',
        lis: 'dp[i] = \\max\\bigl(1,\\; \\max_{j < i,\\, A[j] < A[i]} \\underbrace{dp[j] + 1}_{\\color{#4ade80}\\text{extend from } j}\\bigr)',
        editDistance: 'ed[i][j] = \\begin{cases} \\color{#4ade80}{ed[i\\!-\\!1][j\\!-\\!1]} & \\text{if } X[i] = Y[j] \\\\ 1 + \\min(\\color{#fbbf24}{ed[i\\!-\\!1][j]}_{del},\\; \\color{#fbbf24}{ed[i][j\\!-\\!1]}_{ins},\\; \\color{#fbbf24}{ed[i\\!-\\!1][j\\!-\\!1]}_{rep}) & \\text{else} \\end{cases}'
      };
      var tmpl = templates[activeTab];
      if (tmpl) {
        renderKatex(tmpl, recurrenceBox);
      } else {
        recurrenceBox.innerHTML = '&mdash;';
      }
      return;
    }

    var decision = evt.decision || '';
    var isBase = decision.toLowerCase().indexOf('base') >= 0;
    var isTake = decision.toLowerCase().indexOf('take') >= 0 || decision.toLowerCase().indexOf('use') >= 0;
    var isMatch = decision.toLowerCase().indexOf('match') >= 0;

    // Build KaTeX for each algorithm type with actual values
    var latex = '';
    var r = evt.row, c = evt.col, v = evt.value;
    var deps = evt.deps || [];

    if (activeTab === 'knapsack01') {
      if (isBase) {
        latex = 'DP[' + r + '][' + c + '] = 0 \\quad \\text{(base case)}';
      } else if (deps.length === 1) {
        // Only skip (item doesn't fit)
        var d = deps[0];
        latex = 'DP[' + r + '][' + c + '] = \\color{#fbbf24}{DP[' + d.row + '][' + d.col + ']} = ' + v;
      } else if (deps.length === 2) {
        var skipDep = deps[0], takeDep = deps[1];
        var preset = AlgoVis.DP_PRESETS.knapsack01;
        var item = preset.items[r - 1];
        var skipVal = '?', takeVal = '?';
        // Get values from the current cell states
        if (cellStates[skipDep.row] && cellStates[skipDep.row][skipDep.col]) {
          skipVal = cellStates[skipDep.row][skipDep.col].value;
        }
        if (cellStates[takeDep.row] && cellStates[takeDep.row][takeDep.col]) {
          takeVal = cellStates[takeDep.row][takeDep.col].value;
        }
        var takeTotal = (takeVal !== '' && takeVal !== '?') ? (Number(takeVal) + item.v) : '?';

        if (isTake) {
          latex = 'DP[' + r + '][' + c + '] = \\max\\bigl(\\color{#fbbf24}{\\underbrace{' + skipVal + '}_{DP[' + skipDep.row + '][' + skipDep.col + ']\\;skip}},\\;'
            + '\\color{#4ade80}{\\underbrace{' + takeVal + ' + ' + item.v + '}_{DP[' + takeDep.row + '][' + takeDep.col + '] + v_{' + item.name + '}\\;take}}\\bigr) = \\boxed{' + v + '}';
        } else {
          latex = 'DP[' + r + '][' + c + '] = \\max\\bigl(\\color{#4ade80}{\\underbrace{' + skipVal + '}_{DP[' + skipDep.row + '][' + skipDep.col + ']\\;skip}},\\;'
            + '\\color{#fbbf24}{\\underbrace{' + takeVal + ' + ' + item.v + '}_{DP[' + takeDep.row + '][' + takeDep.col + '] + v_{' + item.name + '}\\;take}}\\bigr) = \\boxed{' + v + '}';
        }
      }
    } else if (activeTab === 'knapsackUnbounded') {
      if (isBase) {
        latex = 's[' + c + '] = 0 \\quad \\text{(base case)}';
      } else {
        // Show all item options
        var parts = [];
        var preset = AlgoVis.DP_PRESETS.knapsackUnbounded;
        for (var di = 0; di < deps.length; di++) {
          var dep = deps[di];
          var depVal = (cellStates[dep.row] && cellStates[dep.row][dep.col]) ? cellStates[dep.row][dep.col].value : '?';
          var itemIdx = -1;
          for (var ii = 0; ii < preset.items.length; ii++) {
            if (c - preset.items[ii].w === dep.col) { itemIdx = ii; break; }
          }
          var itemV = itemIdx >= 0 ? preset.items[itemIdx].v : '?';
          parts.push(depVal + '+' + itemV);
        }
        latex = 's[' + c + '] = \\max(' + parts.join(',\\;') + ') = \\boxed{' + v + '}';
      }
    } else if (activeTab === 'lcs') {
      if (isBase) {
        latex = 'LCS[' + r + '][' + c + '] = 0 \\quad \\text{(base case)}';
      } else if (isMatch) {
        var dd = deps[0];
        var ddVal = (cellStates[dd.row] && cellStates[dd.row][dd.col]) ? cellStates[dd.row][dd.col].value : '?';
        var preset = AlgoVis.DP_PRESETS.lcs;
        latex = '\\text{' + preset.X[r - 1] + ' = ' + preset.Y[c - 1] + '} \\implies LCS[' + r + '][' + c + '] = \\color{#4ade80}{LCS[' + dd.row + '][' + dd.col + '] + 1} = \\color{#4ade80}{' + ddVal + '+1} = \\boxed{' + v + '}';
      } else {
        var upDep = deps[0], leftDep = deps[1];
        var upVal = (cellStates[upDep.row] && cellStates[upDep.row][upDep.col]) ? cellStates[upDep.row][upDep.col].value : '?';
        var leftVal = (cellStates[leftDep.row] && cellStates[leftDep.row][leftDep.col]) ? cellStates[leftDep.row][leftDep.col].value : '?';
        var preset = AlgoVis.DP_PRESETS.lcs;
        latex = '\\text{' + preset.X[r - 1] + ' \\neq ' + preset.Y[c - 1] + '} \\implies LCS[' + r + '][' + c + '] = \\max(\\color{#fbbf24}{' + upVal + '},\\;\\color{#fbbf24}{' + leftVal + '}) = \\boxed{' + v + '}';
      }
    } else if (activeTab === 'lis') {
      if (isBase) {
        latex = 'dp[' + (c + 1) + '] = 1 \\quad \\text{(base case)}';
      } else if (deps.length === 0) {
        latex = 'dp[' + (c + 1) + '] = 1 \\quad \\text{(no valid j found)}';
      } else {
        var preset = AlgoVis.DP_PRESETS.lis;
        var bestJ = -1, bestVal = 0;
        for (var di = 0; di < deps.length; di++) {
          var dep = deps[di];
          var dv = (cellStates[dep.row] && cellStates[dep.row][dep.col]) ? Number(cellStates[dep.row][dep.col].value) : 0;
          if (dv + 1 >= v) { bestJ = dep.col; bestVal = dv; }
        }
        if (bestJ >= 0) {
          latex = 'dp[' + (c + 1) + '] = \\color{#4ade80}{dp[' + (bestJ + 1) + '] + 1} = \\color{#4ade80}{' + bestVal + '+1} = \\boxed{' + v + '}';
          latex += '\\quad A[' + (bestJ + 1) + ']\\!=\\!' + preset.A[bestJ] + ' < ' + preset.A[c] + '\\!=\\!A[' + (c + 1) + ']';
        } else {
          latex = 'dp[' + (c + 1) + '] = \\boxed{' + v + '}';
        }
      }
    } else if (activeTab === 'editDistance') {
      if (isBase) {
        latex = 'ed[' + r + '][' + c + '] = ' + v + ' \\quad \\text{(base case)}';
      } else if (isMatch) {
        var dd = deps[0];
        var ddVal = (cellStates[dd.row] && cellStates[dd.row][dd.col]) ? cellStates[dd.row][dd.col].value : '?';
        var preset = AlgoVis.DP_PRESETS.editDistance;
        latex = '\\text{' + preset.X[r - 1] + ' = ' + preset.Y[c - 1] + '} \\implies ed[' + r + '][' + c + '] = \\color{#4ade80}{ed[' + dd.row + '][' + dd.col + ']} = \\boxed{' + v + '}';
      } else {
        var preset = AlgoVis.DP_PRESETS.editDistance;
        // deps: [delete=i-1,j], [insert=i,j-1], [replace=i-1,j-1]
        var vals = [];
        var labels = ['del', 'ins', 'rep'];
        for (var di = 0; di < deps.length; di++) {
          var dep = deps[di];
          var dv = (cellStates[dep.row] && cellStates[dep.row][dep.col]) ? cellStates[dep.row][dep.col].value : '?';
          vals.push(dv);
        }
        latex = '\\text{' + preset.X[r - 1] + ' \\neq ' + preset.Y[c - 1] + '} \\implies ed[' + r + '][' + c + '] = 1 + \\min(';
        var minParts = [];
        for (var di = 0; di < vals.length; di++) {
          minParts.push('\\color{#fbbf24}{\\underbrace{' + vals[di] + '}_{' + labels[di] + '}}');
        }
        latex += minParts.join(',\\;') + ') = \\boxed{' + v + '}';
      }
    }

    // Render
    if (latex) {
      renderKatex(latex, recurrenceBox);
    } else {
      recurrenceBox.innerHTML = escapeHtml(evt.formula || '');
    }

    // Decision badge below
    var badgeHtml = '';
    if (!isBase) {
      var badgeClass = isTake || isMatch ? 'take' : 'skip';
      var badgeIcon = isTake || isMatch ? '&#10003;' : '&#10007;';
      badgeHtml = '<div style="margin-top:8px;"><span class="decision-badge ' + badgeClass + '">' + badgeIcon + ' ' + escapeHtml(decision) + '</span></div>';
    }

    // Dep cells note
    if (deps.length > 0) {
      badgeHtml += '<div style="margin-top:6px;font-size:0.78rem;color:#888;">';
      badgeHtml += '<span style="color:#fbbf24;">Yellow cells</span>: ';
      var depStrs = [];
      for (var i = 0; i < deps.length; i++) {
        depStrs.push('[' + deps[i].row + '][' + deps[i].col + ']');
      }
      badgeHtml += depStrs.join(', ');
      badgeHtml += '</div>';
    }

    if (badgeHtml) {
      var extra = document.createElement('div');
      extra.innerHTML = badgeHtml;
      recurrenceBox.appendChild(extra);
    }
  }

  // ---- Step info ----
  function showStepInfo(evt, index) {
    if (!evt) return;

    if (evt.type === 'init') {
      stepInfo.innerHTML = '<div class="step-title">Table Initialized</div>' +
        'DP table created (' + rowLabels.length + ' rows &times; ' + colLabels.length + ' cols).<br>' +
        'Base cases will be filled first.';
    } else if (evt.type === 'fill-cell') {
      stepInfo.innerHTML = '<div class="step-title">Filling [' + evt.row + '][' + evt.col + '] = ' + evt.value + '</div>' +
        'Step ' + index + ' of ' + (events.length - 1);
    } else if (evt.type === 'done') {
      stepInfo.innerHTML = '<div class="step-title">Done!</div>' +
        'Optimal answer: <span class="highlight">' + evt.answer + '</span>';
    }
  }

  // ---- Highlight item being considered (for knapsack) ----
  function highlightCurrentItem(evt) {
    if (activeTab !== 'knapsack01' && activeTab !== 'knapsackUnbounded') return;
    var rows = document.querySelectorAll('#inputDisplay .items-table tbody tr');
    rows.forEach(function (tr) { tr.classList.remove('item-highlight'); });

    if (evt && evt.type === 'fill-cell' && evt.decision) {
      var preset = AlgoVis.DP_PRESETS[activeTab];
      for (var i = 0; i < preset.items.length; i++) {
        if (evt.decision.indexOf(preset.items[i].name) >= 0) {
          if (rows[i]) rows[i].classList.add('item-highlight');
        }
      }
    }
  }

  // ---- Main event handler ----
  function onEvent(evt, index) {
    if (evt.type === 'init') {
      initCellStates(evt.rows, evt.cols);
    }

    rebuildState(index);
    renderTable();
    showLiveRecurrence(evt);
    showStepInfo(evt, index);
    highlightCurrentItem(evt);
  }

  // ---- Run algorithm ----
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

    showProblem(algo);
    setPseudocode(algo);

    if (player) player.pause();
    player = AlgoVis.createPlayer(events, onEvent);
  }

  // ---- Tab switching ----
  var tabs = document.querySelectorAll('#algoTabs .tab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener('click', function () {
      for (var j = 0; j < tabs.length; j++) tabs[j].classList.remove('active');
      this.classList.add('active');
      activeTab = this.getAttribute('data-algo');
      runAlgorithm(activeTab);
    });
  }

  // ---- Init ----
  runAlgorithm(activeTab);
})();
