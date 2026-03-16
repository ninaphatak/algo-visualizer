/* ============================================
   CS 141 Algorithm Visualizer — Parallel Prefix Sum
   ============================================ */

window.AlgoVis = window.AlgoVis || {};

AlgoVis.runPrefixSum = function (A) {
  var events = [];
  var workCount = 0;
  var spanCount = 0;

  events.push({ type: 'init', array: A.slice() });

  function prefixSum(In, level) {
    var n = In.length;

    if (n === 1) {
      events.push({
        type: 'base-case',
        level: level,
        array: In.slice()
      });
      return In.slice();
    }

    // Phase 1: pair up
    var B = [];
    var halfN = Math.floor(n / 2);
    for (var i = 0; i < halfN; i++) {
      B.push(In[2 * i] + In[2 * i + 1]);
      workCount++;
    }
    spanCount++; // parallel_for is O(1) span

    events.push({
      type: 'pair-up',
      level: level,
      input: In.slice(),
      paired: B.slice(),
      description: 'Pair up adjacent elements: B[i] = In[2i-1] + In[2i]'
    });

    // Phase 2: recurse
    var C = prefixSum(B, level + 1);

    events.push({
      type: 'recurse-return',
      level: level,
      prefixOfB: C.slice(),
      description: 'Recursive prefix sum returned'
    });

    // Phase 3: expand back
    var Out = new Array(n);
    Out[0] = In[0];
    workCount++;

    for (var i = 1; i < n; i++) {
      if (i % 2 === 1) {
        // even index in 1-based (i+1 is even) => Out[i] = C[i/2] (0-based: C[Math.floor(i/2)])
        Out[i] = C[Math.floor(i / 2)];
      } else {
        // odd index in 1-based (i+1 is odd) => Out[i] = C[(i-1)/2] + In[i]
        Out[i] = C[Math.floor((i - 1) / 2)] + In[i];
        workCount++;
      }
    }
    spanCount++; // parallel_for O(1) span

    events.push({
      type: 'expand',
      level: level,
      input: In.slice(),
      prefixOfB: C.slice(),
      output: Out.slice(),
      description: 'Expand: Out[1]=In[1]; even i: Out[i]=C[i/2]; odd i: Out[i]=C[(i-1)/2]+In[i]'
    });

    return Out;
  }

  // Pad to power of 2 for clean recursion
  var padded = A.slice();
  while (padded.length > 1 && (padded.length & (padded.length - 1)) !== 0) {
    padded.push(0);
  }

  var result = prefixSum(padded, 0);

  // Trim to original length
  result = result.slice(0, A.length);

  var logN = Math.ceil(Math.log2(A.length));

  events.push({
    type: 'done',
    result: result.slice(),
    work: workCount,
    span: logN * logN,
    workBig: 'O(n)',
    spanBig: 'O(log\u00B2 n)'
  });

  return events;
};
