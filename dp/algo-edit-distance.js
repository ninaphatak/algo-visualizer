/* ============================================
   CS 141 Algorithm Visualizer — Edit Distance
   ============================================ */

window.AlgoVis = window.AlgoVis || {};

/**
 * EditDistance(X, Y)
 * ed[i][0] = i, ed[0][j] = j
 * if X[i] == Y[j]: ed[i][j] = ed[i-1][j-1]
 * else: ed[i][j] = 1 + min(ed[i-1][j], ed[i][j-1], ed[i-1][j-1])
 */
AlgoVis.runEditDistance = function (X, Y) {
  var m = X.length;
  var n = Y.length;
  var events = [];

  // Row labels: 0, X chars; Col labels: 0, Y chars
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
  var ed = [];
  for (var i = 0; i <= m; i++) {
    ed[i] = [];
    for (var j = 0; j <= n; j++) {
      ed[i][j] = 0;
    }
  }

  // Base cases: row 0
  for (var j = 0; j <= n; j++) {
    ed[0][j] = j;
    events.push({
      type: 'fill-cell',
      row: 0,
      col: j,
      value: j,
      deps: [],
      formula: 'ed[0][' + j + '] = ' + j + ' (insert ' + j + ' chars)',
      decision: 'Base case: insert ' + j + ' characters'
    });
  }

  // Base cases: col 0 (skip i=0 already done)
  for (var i = 1; i <= m; i++) {
    ed[i][0] = i;
    events.push({
      type: 'fill-cell',
      row: i,
      col: 0,
      value: i,
      deps: [],
      formula: 'ed[' + i + '][0] = ' + i + ' (delete ' + i + ' chars)',
      decision: 'Base case: delete ' + i + ' characters'
    });
  }

  // Fill table
  for (var i = 1; i <= m; i++) {
    for (var j = 1; j <= n; j++) {
      var xi = X[i - 1];
      var yj = Y[j - 1];

      if (xi === yj) {
        // Match — no edit needed
        ed[i][j] = ed[i - 1][j - 1];
        events.push({
          type: 'fill-cell',
          row: i,
          col: j,
          value: ed[i][j],
          deps: [{ row: i - 1, col: j - 1 }],
          formula: 'ed[' + i + '][' + j + '] = ed[' + (i - 1) + '][' + (j - 1) + '] = ' + ed[i][j] + ' (match)',
          decision: 'Match'
        });
      } else {
        var del = ed[i - 1][j];     // delete X[i]
        var ins = ed[i][j - 1];     // insert Y[j]
        var rep = ed[i - 1][j - 1]; // replace X[i] -> Y[j]
        var minVal = Math.min(del, ins, rep);
        ed[i][j] = 1 + minVal;

        var deps = [
          { row: i - 1, col: j },
          { row: i, col: j - 1 },
          { row: i - 1, col: j - 1 }
        ];

        var formula = 'ed[' + i + '][' + j + '] = 1 + min(ed[' + (i - 1) + '][' + j + '], ed[' + i + '][' + (j - 1) + '], ed[' + (i - 1) + '][' + (j - 1) + ']) = 1 + min(' + del + ', ' + ins + ', ' + rep + ') = ' + ed[i][j];

        var decision;
        if (minVal === rep) {
          decision = 'Replace ' + xi + ' -> ' + yj;
        } else if (minVal === del) {
          decision = 'Delete ' + xi;
        } else {
          decision = 'Insert ' + yj;
        }

        events.push({
          type: 'fill-cell',
          row: i,
          col: j,
          value: ed[i][j],
          deps: deps,
          formula: formula,
          decision: decision
        });
      }
    }
  }

  events.push({ type: 'done', answer: ed[m][n], table: ed });

  return events;
};
