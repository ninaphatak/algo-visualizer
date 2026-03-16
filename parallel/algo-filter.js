/* ============================================
   CS 141 Algorithm Visualizer — Parallel Filter
   ============================================ */

window.AlgoVis = window.AlgoVis || {};

AlgoVis.runFilter = function (A, predicate) {
  var events = [];
  var pred;

  if (predicate === 'odd') {
    pred = function (x) { return x % 2 !== 0; };
  } else if (predicate === 'even') {
    pred = function (x) { return x % 2 === 0; };
  } else if (predicate === '>5') {
    pred = function (x) { return x > 5; };
  } else {
    pred = function (x) { return x % 2 !== 0; };
  }

  events.push({ type: 'init', array: A.slice(), predicate: predicate });

  // Step 1: parallel_for flag[i] = pred(A[i])
  var flag = [];
  for (var i = 0; i < A.length; i++) {
    flag.push(pred(A[i]) ? 1 : 0);
  }

  events.push({
    type: 'flag',
    array: A.slice(),
    flag: flag.slice(),
    description: 'Compute flag array: flag[i] = pred(A[i])'
  });

  // Step 2: prefix sum of flag array
  // Inline simple prefix sum for the flag array
  var ps = [];
  var running = 0;
  for (var i = 0; i < flag.length; i++) {
    running += flag[i];
    ps.push(running);
  }

  events.push({
    type: 'prefix-sum',
    array: A.slice(),
    flag: flag.slice(),
    prefixSum: ps.slice(),
    description: 'Compute prefix sum of flag array (using parallel prefix sum)'
  });

  // Step 3: scatter
  var totalOutput = ps[ps.length - 1];
  var B = new Array(totalOutput);
  var scatterIndices = [];

  for (var i = 0; i < A.length; i++) {
    if (flag[i]) {
      var destIdx = ps[i] - 1;
      B[destIdx] = A[i];
      scatterIndices.push({ src: i, dest: destIdx, value: A[i] });
    }
  }

  events.push({
    type: 'scatter',
    array: A.slice(),
    flag: flag.slice(),
    prefixSum: ps.slice(),
    output: B.slice(),
    scatterIndices: scatterIndices,
    description: 'Scatter: if flag[i] then B[ps[i]] = A[i]'
  });

  events.push({
    type: 'done',
    input: A.slice(),
    output: B.slice(),
    predicate: predicate,
    work: A.length * 3,
    span: Math.ceil(Math.log2(A.length)) * Math.ceil(Math.log2(A.length)),
    workBig: 'O(n)',
    spanBig: 'O(log\u00B2 n)'
  });

  return events;
};
