/* ============================================
   CS 141 Algorithm Visualizer — Longest Common Subsequence
   ============================================ */

window.AlgoVis = window.AlgoVis || {};

/**
 * LCS(X, Y)
 * LCS[i][0] = 0, LCS[0][j] = 0
 * if X[i] == Y[j]: LCS[i][j] = LCS[i-1][j-1] + 1
 * else: LCS[i][j] = max(LCS[i-1][j], LCS[i][j-1])
 */
AlgoVis.runLCS = function (X, Y) {
  var m = X.length;
  var n = Y.length;
  var events = [];

  // Row labels: "", Y[1]..Y[n] — but rows are X, cols are Y
  var rowLabels = ['0'];
  for (var i = 0; i < m; i++) {
    rowLabels.push(X[i]);
  }
  var colLabels = ['0'];
  for (var j = 0; j < n; j++) {
    colLabels.push(Y[j]);
  }

  events.push({ type: 'init', rows: rowLabels, cols: colLabels });

  // Initialize table
  var dp = [];
  for (var i = 0; i <= m; i++) {
    dp[i] = [];
    for (var j = 0; j <= n; j++) {
      dp[i][j] = 0;
    }
  }

  // Base cases: row 0
  for (var j = 0; j <= n; j++) {
    events.push({
      type: 'fill-cell',
      row: 0,
      col: j,
      value: 0,
      deps: [],
      formula: 'LCS[0][' + j + '] = 0 (base case)',
      decision: 'Base case: empty X prefix'
    });
  }

  // Base cases: col 0 (skip row 0 already done)
  for (var i = 1; i <= m; i++) {
    events.push({
      type: 'fill-cell',
      row: i,
      col: 0,
      value: 0,
      deps: [],
      formula: 'LCS[' + i + '][0] = 0 (base case)',
      decision: 'Base case: empty Y prefix'
    });
  }

  // Fill table
  for (var i = 1; i <= m; i++) {
    for (var j = 1; j <= n; j++) {
      var xi = X[i - 1];
      var yj = Y[j - 1];

      if (xi === yj) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        events.push({
          type: 'fill-cell',
          row: i,
          col: j,
          value: dp[i][j],
          deps: [{ row: i - 1, col: j - 1 }],
          formula: 'LCS[' + i + '][' + j + '] = LCS[' + (i - 1) + '][' + (j - 1) + '] + 1 = ' + dp[i - 1][j - 1] + ' + 1 = ' + dp[i][j],
          decision: 'Match X[' + i + ']=' + xi + ' = Y[' + j + ']=' + yj
        });
      } else {
        var up = dp[i - 1][j];
        var left = dp[i][j - 1];
        dp[i][j] = Math.max(up, left);
        events.push({
          type: 'fill-cell',
          row: i,
          col: j,
          value: dp[i][j],
          deps: [{ row: i - 1, col: j }, { row: i, col: j - 1 }],
          formula: 'LCS[' + i + '][' + j + '] = max(LCS[' + (i - 1) + '][' + j + '], LCS[' + i + '][' + (j - 1) + ']) = max(' + up + ', ' + left + ') = ' + dp[i][j],
          decision: 'Skip: max(up=' + up + ', left=' + left + ')'
        });
      }
    }
  }

  events.push({ type: 'done', answer: dp[m][n], table: dp });

  return events;
};
