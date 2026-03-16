/* ============================================
   CS 141 Algorithm Visualizer — Knapsack Algorithms
   ============================================ */

window.AlgoVis = window.AlgoVis || {};

/**
 * 0/1 Knapsack
 * DP[i][j] = max value using items 1..i with capacity j
 * Uses DP[i-1] (previous row) — each item used at most once.
 */
AlgoVis.runKnapsack01 = function (items, W) {
  var n = items.length;
  var events = [];

  // Row labels: "0", item names; Col labels: 0..W
  var rowLabels = ['0'];
  for (var i = 0; i < n; i++) {
    rowLabels.push(items[i].name || ('Item ' + (i + 1)));
  }
  var colLabels = [];
  for (var j = 0; j <= W; j++) {
    colLabels.push(String(j));
  }

  events.push({ type: 'init', rows: rowLabels, cols: colLabels });

  // Initialize DP table
  var dp = [];
  for (var i = 0; i <= n; i++) {
    dp[i] = [];
    for (var j = 0; j <= W; j++) {
      dp[i][j] = 0;
    }
  }

  // Base case row (i=0): all zeros
  for (var j = 0; j <= W; j++) {
    events.push({
      type: 'fill-cell',
      row: 0,
      col: j,
      value: 0,
      deps: [],
      formula: 'DP[0][' + j + '] = 0 (base case)',
      decision: 'Base case: no items available'
    });
  }

  // Fill table
  for (var i = 1; i <= n; i++) {
    var item = items[i - 1];
    var wi = item.w;
    var vi = item.v;

    for (var j = 0; j <= W; j++) {
      // Default: skip item
      dp[i][j] = dp[i - 1][j];
      var deps = [{ row: i - 1, col: j }];
      var formula = 'DP[' + i + '][' + j + '] = DP[' + (i - 1) + '][' + j + '] = ' + dp[i - 1][j];
      var decision = 'Skip item ' + (items[i - 1].name || i);

      // Can we take the item?
      if (j >= wi) {
        var takeVal = dp[i - 1][j - wi] + vi;
        if (takeVal > dp[i][j]) {
          dp[i][j] = takeVal;
          deps.push({ row: i - 1, col: j - wi });
          formula = 'DP[' + i + '][' + j + '] = max(DP[' + (i - 1) + '][' + j + '], DP[' + (i - 1) + '][' + (j - wi) + '] + ' + vi + ') = max(' + dp[i - 1][j] + ', ' + (dp[i - 1][j - wi]) + ' + ' + vi + ') = ' + dp[i][j];
          decision = 'Take item ' + (items[i - 1].name || i) + ' (w=' + wi + ', v=' + vi + ')';
        } else {
          // Item fits but not worth taking
          formula = 'DP[' + i + '][' + j + '] = max(DP[' + (i - 1) + '][' + j + '], DP[' + (i - 1) + '][' + (j - wi) + '] + ' + vi + ') = max(' + dp[i - 1][j] + ', ' + (dp[i - 1][j - wi]) + ' + ' + vi + ') = ' + dp[i][j];
          deps.push({ row: i - 1, col: j - wi });
        }
      }

      events.push({
        type: 'fill-cell',
        row: i,
        col: j,
        value: dp[i][j],
        deps: deps,
        formula: formula,
        decision: decision
      });
    }
  }

  events.push({ type: 'done', answer: dp[n][W], table: dp });

  return events;
};

/**
 * Unbounded Knapsack
 * s[0] = 0, s[w] = max over items(s[w-wj] + vj)
 * Uses s[w-wj] (same row) — items are reusable.
 */
AlgoVis.runKnapsackUnbounded = function (items, W) {
  var events = [];

  // 1D table: single row, columns 0..W
  var colLabels = [];
  for (var j = 0; j <= W; j++) {
    colLabels.push(String(j));
  }

  events.push({ type: 'init', rows: ['s'], cols: colLabels });

  var s = [];
  for (var j = 0; j <= W; j++) {
    s[j] = 0;
  }

  // Base case
  events.push({
    type: 'fill-cell',
    row: 0,
    col: 0,
    value: 0,
    deps: [],
    formula: 's[0] = 0 (base case)',
    decision: 'Base case: capacity 0'
  });

  // Fill
  for (var w = 1; w <= W; w++) {
    var bestVal = 0;
    var bestItem = null;
    var deps = [];
    var tried = [];

    for (var k = 0; k < items.length; k++) {
      var item = items[k];
      if (w >= item.w) {
        deps.push({ row: 0, col: w - item.w });
        var candidate = s[w - item.w] + item.v;
        tried.push('s[' + (w - item.w) + ']+' + item.v + '=' + candidate);
        if (candidate > bestVal) {
          bestVal = candidate;
          bestItem = item;
        }
      }
    }

    s[w] = bestVal;

    var formula = 's[' + w + '] = max(' + tried.join(', ') + ') = ' + bestVal;
    var decision = bestItem
      ? 'Use item ' + (bestItem.name || '?') + ' (w=' + bestItem.w + ', v=' + bestItem.v + ')'
      : 'No item fits';

    if (tried.length === 0) {
      formula = 's[' + w + '] = 0 (no item fits)';
    }

    events.push({
      type: 'fill-cell',
      row: 0,
      col: w,
      value: s[w],
      deps: deps,
      formula: formula,
      decision: decision
    });
  }

  events.push({ type: 'done', answer: s[W], table: [s] });

  return events;
};
