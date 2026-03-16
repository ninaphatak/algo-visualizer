/* ============================================
   CS 141 Algorithm Visualizer — Parallel UI
   ============================================ */

(function () {
  'use strict';

  var activeTab = 'reduce';
  var activePreset = 'basic';
  var player = null;
  var filterPredicate = 'odd';

  /* ---- Pseudocode definitions ---- */
  var PSEUDOCODES = {
    reduce: [
      'reduce(A, n):',
      '  if n == 1: return A[0]',
      '  in parallel:',
      '    L = reduce(A[0..n/2])',
      '    R = reduce(A[n/2..n])',
      '  return L + R'
    ],
    'prefix-sum': [
      'PrefixSum(In[1..n]):',
      '  if n==1: Out[1]=In[1]; return',
      '  par_for i=1 to n/2:',
      '    B[i] = In[2i-1] + In[2i]',
      '  C = PrefixSum(B[1..n/2])',
      '  Out[1] = In[1]',
      '  par_for i=2 to n:',
      '    if even: Out[i] = C[i/2]',
      '    if odd:  Out[i] = C[(i-1)/2]+In[i]'
    ],
    filter: [
      'Filter(A, pred):',
      '  par_for: flag[i] = pred(A[i])',
      '  ps = prefix_sum(flag)',
      '  par_for: if flag[i]:',
      '    B[ps[i]] = A[i]',
      '  return B'
    ],
    quicksort: [
      'pquicksort(A, n):',
      '  if n <= 1: return A',
      '  pivot = choose(A)',
      '  L = filter(A, < pivot)',
      '  R = filter(A, > pivot)',
      '  in parallel:',
      '    L\' = pquicksort(L)',
      '    R\' = pquicksort(R)',
      '  return L\' ++ [pivot] ++ R\''
    ],
    mergesort: [
      'pmergesort(A, n):',
      '  if n == 1: return A',
      '  in parallel:',
      '    L = pmergesort(A[0..n/2])',
      '    R = pmergesort(A[n/2..n])',
      '  return parallel_merge(L, R)'
    ]
  };

  /* ---- Complexity info ---- */
  var COMPLEXITY = {
    reduce:       { work: 'O(n)', span: 'O(log n)' },
    'prefix-sum': { work: 'O(n)', span: 'O(log\u00B2 n)' },
    filter:       { work: 'O(n)', span: 'O(log\u00B2 n)' },
    quicksort:    { work: 'O(n log n)', span: 'O(log\u00B2 n)' },
    mergesort:    { work: 'O(n log n)', span: 'O(log\u00B2 n)' }
  };

  /* ---- DOM references ---- */
  var canvas       = document.getElementById('treeCanvas');
  var arrayDisplay = document.getElementById('arrayDisplay');
  var stepInfo     = document.getElementById('stepInfo');
  var workValue    = document.getElementById('workValue');
  var spanValue    = document.getElementById('spanValue');
  var pseudocode   = document.getElementById('pseudocode');
  var presetBtns   = document.getElementById('presetBtns');
  var sidebarArray = document.getElementById('sidebarArray');

  /* ---- Render pseudocode ---- */
  function renderPseudocode(tab, activeLine) {
    var lines = PSEUDOCODES[tab] || [];
    var html = '';
    for (var i = 0; i < lines.length; i++) {
      var cls = (i === activeLine) ? 'line active' : 'line';
      html += '<div class="' + cls + '" data-line="' + i + '">' + lines[i] + '</div>';
    }
    pseudocode.innerHTML = html;
  }

  /* ---- Render array boxes ---- */
  function renderArrayBoxes(container, arr, highlights) {
    highlights = highlights || {};
    var html = '';
    for (var i = 0; i < arr.length; i++) {
      var cls = 'arr-box';
      if (highlights[i]) cls += ' ' + highlights[i];
      html += '<div class="' + cls + '">' + arr[i] + '</div>';
    }
    container.innerHTML = html;
  }

  /* ---- Render labeled array row ---- */
  function renderArrayRow(label, arr, highlights) {
    var html = '<div class="array-row">';
    html += '<div class="array-row-label">' + label + '</div>';
    html += '<div class="array-display">';
    for (var i = 0; i < arr.length; i++) {
      var cls = 'arr-box';
      if (highlights && highlights[i]) cls += ' ' + highlights[i];
      html += '<div class="' + cls + '">' + arr[i] + '</div>';
    }
    html += '</div></div>';
    return html;
  }

  /* ---- Set up preset buttons ---- */
  function setupPresets() {
    var html = '';
    var presets = AlgoVis.PARALLEL_PRESETS;
    for (var key in presets) {
      if (presets.hasOwnProperty(key)) {
        var cls = (key === activePreset) ? 'preset-btn active' : 'preset-btn';
        html += '<button class="' + cls + '" data-preset="' + key + '">' + presets[key].name + '</button>';
      }
    }
    presetBtns.innerHTML = html;

    presetBtns.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-preset]');
      if (!btn) return;
      activePreset = btn.getAttribute('data-preset');
      // Update active class
      var allBtns = presetBtns.querySelectorAll('.preset-btn');
      for (var i = 0; i < allBtns.length; i++) allBtns[i].classList.remove('active');
      btn.classList.add('active');
      runAlgorithm();
    });
  }

  /* ---- Tab switching ---- */
  function setupTabs() {
    var tabs = document.querySelectorAll('#algoTabs .tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function () {
        for (var j = 0; j < tabs.length; j++) tabs[j].classList.remove('active');
        this.classList.add('active');
        activeTab = this.getAttribute('data-tab');
        runAlgorithm();
      });
    }
  }

  /* ---- Run the active algorithm ---- */
  function runAlgorithm() {
    var A = AlgoVis.PARALLEL_PRESETS[activePreset].A.slice();
    var events;

    switch (activeTab) {
      case 'reduce':
        events = AlgoVis.runReduce(A);
        break;
      case 'prefix-sum':
        events = AlgoVis.runPrefixSum(A);
        break;
      case 'filter':
        events = AlgoVis.runFilter(A, filterPredicate);
        break;
      case 'quicksort':
        events = AlgoVis.runParallelQuicksort(A);
        break;
      case 'mergesort':
        events = AlgoVis.runParallelMergeSort(A);
        break;
      default:
        events = AlgoVis.runReduce(A);
    }

    // Update complexity display
    var comp = COMPLEXITY[activeTab] || {};
    workValue.textContent = comp.work || '--';
    spanValue.textContent = comp.span || '--';

    // Render initial pseudocode
    renderPseudocode(activeTab, -1);

    // Render sidebar array
    renderArrayBoxes(sidebarArray, A, {});

    // Clear displays
    arrayDisplay.innerHTML = '';
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    // Create player
    if (player) {
      player.pause();
    }
    player = AlgoVis.createPlayer(events, onEvent);
  }

  /* ---- Handle events ---- */
  function onEvent(evt, index) {
    if (!evt) return;

    switch (activeTab) {
      case 'reduce':
        handleReduceEvent(evt);
        break;
      case 'prefix-sum':
        handlePrefixSumEvent(evt);
        break;
      case 'filter':
        handleFilterEvent(evt);
        break;
      case 'quicksort':
        handleQuicksortEvent(evt);
        break;
      case 'mergesort':
        handleMergesortEvent(evt);
        break;
    }
  }

  /* ---- Reduce event handler ---- */
  function handleReduceEvent(evt) {
    switch (evt.type) {
      case 'init':
        stepInfo.innerHTML = '<div class="step-title">Initialize</div>Input array: [' + evt.array.join(', ') + ']';
        renderArrayBoxes(sidebarArray, evt.array, {});
        renderPseudocode('reduce', 0);
        break;

      case 'fork':
        stepInfo.innerHTML = '<div class="step-title">Fork (Level ' + evt.level + ')</div>' +
          'Split into <span class="highlight">left</span> ' + JSON.stringify(evt.left) +
          ' and <span class="highlight" style="color:#c084fc">right</span> ' + JSON.stringify(evt.right);
        renderPseudocode('reduce', 2);
        var highlights = {};
        for (var i = 0; i < evt.left.length; i++) highlights[evt.left[i]] = 'highlight-left';
        for (var i = 0; i < evt.right.length; i++) highlights[evt.right[i]] = 'highlight-right';
        var A = AlgoVis.PARALLEL_PRESETS[activePreset].A;
        renderArrayBoxes(sidebarArray, A, highlights);
        if (evt.treeNodes) renderTreeFromNodes(evt.treeNodes);
        break;

      case 'compute':
        stepInfo.innerHTML = '<div class="step-title">Base Case (Level ' + evt.level + ')</div>' +
          'Leaf at index ' + evt.index + ' = <span class="highlight">' + evt.value + '</span>';
        renderPseudocode('reduce', 1);
        if (evt.treeNodes) renderTreeFromNodes(evt.treeNodes);
        break;

      case 'join':
        stepInfo.innerHTML = '<div class="step-title">Join (Level ' + evt.level + ')</div>' +
          '<span class="highlight">' + evt.leftVal + '</span> + ' +
          '<span class="highlight" style="color:#c084fc">' + evt.rightVal + '</span> = ' +
          '<span class="highlight" style="color:#4ade80">' + evt.result + '</span>';
        renderPseudocode('reduce', 5);
        if (evt.treeNodes) renderTreeFromNodes(evt.treeNodes);
        break;

      case 'done':
        stepInfo.innerHTML = '<div class="step-title">Done</div>' +
          'Result: <span class="highlight" style="color:#4ade80">' + evt.result + '</span><br>' +
          'Work: ' + evt.work + ' ops, Span: ' + evt.span + ' levels';
        renderPseudocode('reduce', 5);
        if (evt.treeNodes) renderTreeFromNodes(evt.treeNodes);
        break;
    }
  }

  /* ---- Prefix Sum event handler ---- */
  function handlePrefixSumEvent(evt) {
    switch (evt.type) {
      case 'init':
        stepInfo.innerHTML = '<div class="step-title">Initialize</div>Input: [' + evt.array.join(', ') + ']';
        renderArrayBoxes(sidebarArray, evt.array, {});
        arrayDisplay.innerHTML = renderArrayRow('Input', evt.array, {});
        renderPseudocode('prefix-sum', 0);
        break;

      case 'base-case':
        stepInfo.innerHTML = '<div class="step-title">Base Case (Level ' + evt.level + ')</div>' +
          'Single element: [' + evt.array.join(', ') + ']';
        renderPseudocode('prefix-sum', 1);
        break;

      case 'pair-up':
        stepInfo.innerHTML = '<div class="step-title">Pair Up (Level ' + evt.level + ')</div>' +
          evt.description + '<br>B = [' + evt.paired.join(', ') + ']';
        var html = renderArrayRow('Input', evt.input, {});
        html += renderArrayRow('Paired (B)', evt.paired, {});
        arrayDisplay.innerHTML = html;
        renderPseudocode('prefix-sum', 3);
        break;

      case 'recurse-return':
        stepInfo.innerHTML = '<div class="step-title">Recurse Return (Level ' + evt.level + ')</div>' +
          'Prefix sum of B: [' + evt.prefixOfB.join(', ') + ']';
        renderPseudocode('prefix-sum', 4);
        break;

      case 'expand':
        stepInfo.innerHTML = '<div class="step-title">Expand (Level ' + evt.level + ')</div>' +
          evt.description + '<br>Output: [' + evt.output.join(', ') + ']';
        var html = renderArrayRow('Input', evt.input, {});
        html += renderArrayRow('Prefix of B (C)', evt.prefixOfB, {});
        var outHighlights = {};
        for (var i = 0; i < evt.output.length; i++) outHighlights[i] = 'highlight-active';
        html += renderArrayRow('Output', evt.output, outHighlights);
        arrayDisplay.innerHTML = html;
        renderPseudocode('prefix-sum', 7);
        break;

      case 'done':
        stepInfo.innerHTML = '<div class="step-title">Done</div>' +
          'Result: [' + evt.result.join(', ') + ']<br>' +
          'Work: ' + evt.workBig + ', Span: ' + evt.spanBig;
        var outHighlights = {};
        for (var i = 0; i < evt.result.length; i++) outHighlights[i] = 'highlight-active';
        arrayDisplay.innerHTML = renderArrayRow('Prefix Sum', evt.result, outHighlights);
        renderArrayBoxes(sidebarArray, evt.result, outHighlights);
        renderPseudocode('prefix-sum', -1);
        break;
    }
  }

  /* ---- Filter event handler ---- */
  function handleFilterEvent(evt) {
    switch (evt.type) {
      case 'init':
        stepInfo.innerHTML = '<div class="step-title">Initialize</div>' +
          'Input: [' + evt.array.join(', ') + ']<br>Predicate: ' + evt.predicate;
        renderArrayBoxes(sidebarArray, evt.array, {});
        arrayDisplay.innerHTML = renderArrayRow('Input', evt.array, {});
        renderPseudocode('filter', 0);
        break;

      case 'flag':
        stepInfo.innerHTML = '<div class="step-title">Compute Flags</div>' + evt.description;
        var flagHighlights = {};
        for (var i = 0; i < evt.flag.length; i++) {
          if (evt.flag[i]) flagHighlights[i] = 'highlight-active';
        }
        var html = renderArrayRow('Input (A)', evt.array, flagHighlights);
        html += renderArrayRow('Flag', evt.flag, flagHighlights);
        arrayDisplay.innerHTML = html;
        renderPseudocode('filter', 1);
        break;

      case 'prefix-sum':
        stepInfo.innerHTML = '<div class="step-title">Prefix Sum of Flags</div>' + evt.description;
        var html = renderArrayRow('Input (A)', evt.array, {});
        html += renderArrayRow('Flag', evt.flag, {});
        html += renderArrayRow('Prefix Sum', evt.prefixSum, {});
        arrayDisplay.innerHTML = html;
        renderPseudocode('filter', 2);
        break;

      case 'scatter':
        stepInfo.innerHTML = '<div class="step-title">Scatter</div>' + evt.description;
        var srcHighlights = {};
        for (var i = 0; i < evt.scatterIndices.length; i++) {
          srcHighlights[evt.scatterIndices[i].src] = 'highlight-left';
        }
        var destHighlights = {};
        for (var i = 0; i < evt.scatterIndices.length; i++) {
          destHighlights[evt.scatterIndices[i].dest] = 'highlight-active';
        }
        var html = renderArrayRow('Input (A)', evt.array, srcHighlights);
        html += renderArrayRow('Flag', evt.flag, {});
        html += renderArrayRow('Prefix Sum', evt.prefixSum, {});
        html += renderArrayRow('Output (B)', evt.output, destHighlights);
        arrayDisplay.innerHTML = html;
        renderPseudocode('filter', 4);
        break;

      case 'done':
        stepInfo.innerHTML = '<div class="step-title">Done</div>' +
          'Filtered: [' + evt.output.join(', ') + ']<br>' +
          'Work: ' + evt.workBig + ', Span: ' + evt.spanBig;
        var outHighlights = {};
        for (var i = 0; i < evt.output.length; i++) outHighlights[i] = 'highlight-active';
        arrayDisplay.innerHTML = renderArrayRow('Result', evt.output, outHighlights);
        renderArrayBoxes(sidebarArray, evt.output, outHighlights);
        renderPseudocode('filter', -1);
        break;
    }
  }

  /* ---- Quicksort event handler ---- */
  function handleQuicksortEvent(evt) {
    switch (evt.type) {
      case 'init':
        stepInfo.innerHTML = '<div class="step-title">Initialize</div>Input: [' + evt.array.join(', ') + ']';
        renderArrayBoxes(sidebarArray, evt.array, {});
        arrayDisplay.innerHTML = renderArrayRow('Input', evt.array, {});
        renderPseudocode('quicksort', 0);
        break;

      case 'base':
        stepInfo.innerHTML = '<div class="step-title">Base Case (Level ' + evt.level + ')</div>' +
          'Array: [' + evt.array.join(', ') + ']';
        renderPseudocode('quicksort', 1);
        if (evt.treeNodes) renderTreeFromNodes(evt.treeNodes);
        break;

      case 'pivot':
        stepInfo.innerHTML = '<div class="step-title">Pivot Selection (Level ' + evt.level + ')</div>' +
          'Pivot: <span class="highlight" style="color:#fbbf24">' + evt.pivot + '</span><br>' +
          'L (&lt; pivot): [' + evt.left.join(', ') + ']<br>' +
          'E (= pivot): [' + evt.equal.join(', ') + ']<br>' +
          'R (&gt; pivot): [' + evt.right.join(', ') + ']';
        var highlights = {};
        for (var i = 0; i < evt.array.length; i++) {
          if (evt.array[i] < evt.pivot) highlights[i] = 'highlight-left';
          else if (evt.array[i] === evt.pivot) highlights[i] = 'highlight-pivot';
          else highlights[i] = 'highlight-right';
        }
        arrayDisplay.innerHTML = renderArrayRow('Array', evt.array, highlights);
        renderPseudocode('quicksort', 3);
        if (evt.treeNodes) renderTreeFromNodes(evt.treeNodes);
        break;

      case 'combine':
        stepInfo.innerHTML = '<div class="step-title">Combine (Level ' + evt.level + ')</div>' +
          'Result: [' + evt.result.join(', ') + ']';
        var outH = {};
        for (var i = 0; i < evt.result.length; i++) outH[i] = 'highlight-active';
        arrayDisplay.innerHTML = renderArrayRow('Sorted', evt.result, outH);
        renderPseudocode('quicksort', 8);
        if (evt.treeNodes) renderTreeFromNodes(evt.treeNodes);
        break;

      case 'done':
        stepInfo.innerHTML = '<div class="step-title">Done</div>' +
          'Sorted: [' + evt.result.join(', ') + ']<br>' +
          'Work: ' + evt.workBig + ', Span: ' + evt.spanBig;
        var outH = {};
        for (var i = 0; i < evt.result.length; i++) outH[i] = 'highlight-active';
        arrayDisplay.innerHTML = renderArrayRow('Result', evt.result, outH);
        renderArrayBoxes(sidebarArray, evt.result, outH);
        renderPseudocode('quicksort', -1);
        if (evt.treeNodes) renderTreeFromNodes(evt.treeNodes);
        break;
    }
  }

  /* ---- Merge Sort event handler ---- */
  function handleMergesortEvent(evt) {
    switch (evt.type) {
      case 'init':
        stepInfo.innerHTML = '<div class="step-title">Initialize</div>Input: [' + evt.array.join(', ') + ']';
        renderArrayBoxes(sidebarArray, evt.array, {});
        arrayDisplay.innerHTML = renderArrayRow('Input', evt.array, {});
        renderPseudocode('mergesort', 0);
        break;

      case 'base':
        stepInfo.innerHTML = '<div class="step-title">Base Case (Level ' + evt.level + ')</div>' +
          'Single element: [' + evt.array.join(', ') + ']';
        renderPseudocode('mergesort', 1);
        if (evt.treeNodes) renderTreeFromNodes(evt.treeNodes);
        break;

      case 'fork':
        stepInfo.innerHTML = '<div class="step-title">Fork (Level ' + evt.level + ')</div>' +
          'Left: [' + evt.left.join(', ') + ']<br>' +
          'Right: [' + evt.right.join(', ') + ']';
        var html = '';
        var lh = {};
        for (var i = 0; i < evt.left.length; i++) lh[i] = 'highlight-left';
        html += renderArrayRow('Left', evt.left, lh);
        var rh = {};
        for (var i = 0; i < evt.right.length; i++) rh[i] = 'highlight-right';
        html += renderArrayRow('Right', evt.right, rh);
        arrayDisplay.innerHTML = html;
        renderPseudocode('mergesort', 2);
        if (evt.treeNodes) renderTreeFromNodes(evt.treeNodes);
        break;

      case 'merge':
        stepInfo.innerHTML = '<div class="step-title">Merge (Level ' + evt.level + ')</div>' +
          'Merging [' + evt.left.join(', ') + '] and [' + evt.right.join(', ') + ']<br>' +
          'Result: [' + evt.merged.join(', ') + ']';
        var mh = {};
        for (var i = 0; i < evt.merged.length; i++) mh[i] = 'highlight-active';
        arrayDisplay.innerHTML = renderArrayRow('Merged', evt.merged, mh);
        renderPseudocode('mergesort', 5);
        if (evt.treeNodes) renderTreeFromNodes(evt.treeNodes);
        break;

      case 'done':
        stepInfo.innerHTML = '<div class="step-title">Done</div>' +
          'Sorted: [' + evt.result.join(', ') + ']<br>' +
          'Work: ' + evt.workBig + ', Span: ' + evt.spanBig;
        var outH = {};
        for (var i = 0; i < evt.result.length; i++) outH[i] = 'highlight-active';
        arrayDisplay.innerHTML = renderArrayRow('Result', evt.result, outH);
        renderArrayBoxes(sidebarArray, evt.result, outH);
        renderPseudocode('mergesort', -1);
        if (evt.treeNodes) renderTreeFromNodes(evt.treeNodes);
        break;
    }
  }

  /* ---- Render tree from treeNodes array ---- */
  function renderTreeFromNodes(treeNodes) {
    if (!treeNodes || treeNodes.length === 0) {
      var ctx = canvas.getContext('2d');
      var dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      return;
    }

    // Find the root: the last node that has children or the last node overall
    var rootId = treeNodes[treeNodes.length - 1].id;

    // Build set of children
    var childSet = {};
    for (var i = 0; i < treeNodes.length; i++) {
      var children = treeNodes[i].children || [];
      for (var j = 0; j < children.length; j++) {
        childSet[children[j]] = true;
      }
    }

    // Root is the node that is not a child of any other node
    for (var i = treeNodes.length - 1; i >= 0; i--) {
      if (!childSet[treeNodes[i].id]) {
        rootId = treeNodes[i].id;
        break;
      }
    }

    AlgoVis.renderTree(canvas, {
      nodes: treeNodes,
      rootId: rootId
    });
  }

  /* ---- Initialize ---- */
  setupPresets();
  setupTabs();
  runAlgorithm();
})();
