/* ============================================
   CS 141 Algorithm Visualizer — Longest Increasing Subsequence
   ============================================ */

window.AlgoVis = window.AlgoVis || {};

/**
 * LIS(A)
 * dp[i] = 1 for all i
 * for i = 1 to n:
 *   for j = 1 to i-1:
 *     if A[j] < A[i]: dp[i] = max(dp[i], dp[j] + 1)
 */
AlgoVis.runLIS = function (A) {
  var n = A.length;
  var events = [];

  // 1D table: single row, columns for each element
  var colLabels = [];
  for (var i = 0; i < n; i++) {
    colLabels.push('A[' + (i + 1) + ']=' + A[i]);
  }

  events.push({ type: 'init', rows: ['dp'], cols: colLabels });

  var dp = [];
  for (var i = 0; i < n; i++) {
    dp[i] = 1;
  }

  // Initialize all to 1
  events.push({
    type: 'fill-cell',
    row: 0,
    col: 0,
    value: 1,
    deps: [],
    formula: 'dp[1] = 1 (base case)',
    decision: 'Base case: subsequence of length 1'
  });

  // Fill using 1-indexed logic mapped to 0-indexed array
  for (var i = 1; i < n; i++) {
    var deps = [];
    var bestJ = -1;
    var bestVal = 1;

    for (var j = 0; j < i; j++) {
      if (A[j] < A[i]) {
        deps.push({ row: 0, col: j });
        if (dp[j] + 1 > bestVal) {
          bestVal = dp[j] + 1;
          bestJ = j;
        }
      }
    }

    dp[i] = bestVal;

    var formula;
    var decision;

    if (bestJ >= 0) {
      var parts = [];
      for (var j = 0; j < i; j++) {
        if (A[j] < A[i]) {
          parts.push('dp[' + (j + 1) + ']+1=' + (dp[j] + 1));
        }
      }
      formula = 'dp[' + (i + 1) + '] = max(1, ' + parts.join(', ') + ') = ' + dp[i];
      decision = 'Best second-to-last: A[' + (bestJ + 1) + ']=' + A[bestJ] + ' at position ' + (bestJ + 1);
    } else {
      formula = 'dp[' + (i + 1) + '] = 1 (no smaller element before)';
      decision = 'No valid predecessor; subsequence of length 1';
    }

    events.push({
      type: 'fill-cell',
      row: 0,
      col: i,
      value: dp[i],
      deps: deps,
      formula: formula,
      decision: decision
    });
  }

  // Find max
  var answer = 0;
  for (var i = 0; i < n; i++) {
    if (dp[i] > answer) answer = dp[i];
  }

  events.push({ type: 'done', answer: answer, table: [dp] });

  return events;
};
