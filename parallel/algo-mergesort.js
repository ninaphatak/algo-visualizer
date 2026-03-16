/* ============================================
   CS 141 Algorithm Visualizer — Parallel Merge Sort & Quicksort
   ============================================ */

window.AlgoVis = window.AlgoVis || {};

/* ---- Parallel Merge Sort ---- */
AlgoVis.runParallelMergeSort = function (A) {
  var events = [];
  var nodeId = 0;
  var treeNodes = [];

  events.push({ type: 'init', array: A.slice() });

  function buildNode(label, state) {
    var id = 'n' + (nodeId++);
    treeNodes.push({ id: id, label: label, state: state || 'default', children: [] });
    return id;
  }

  function findNode(id) {
    for (var i = 0; i < treeNodes.length; i++) {
      if (treeNodes[i].id === id) return treeNodes[i];
    }
    return null;
  }

  function pmergesort(arr, level) {
    if (arr.length <= 1) {
      var leafId = buildNode(arr.length === 0 ? '[]' : String(arr[0]), 'active');
      events.push({
        type: 'base',
        level: level,
        array: arr.slice(),
        treeNodes: JSON.parse(JSON.stringify(treeNodes))
      });
      findNode(leafId).state = 'default';
      return { sorted: arr.slice(), nodeId: leafId };
    }

    var mid = Math.floor(arr.length / 2);
    var leftArr = arr.slice(0, mid);
    var rightArr = arr.slice(mid);

    events.push({
      type: 'fork',
      level: level,
      left: leftArr.slice(),
      right: rightArr.slice(),
      treeNodes: JSON.parse(JSON.stringify(treeNodes))
    });

    var leftResult = pmergesort(leftArr, level + 1);
    var rightResult = pmergesort(rightArr, level + 1);

    // Merge
    var merged = [];
    var i = 0, j = 0;
    while (i < leftResult.sorted.length && j < rightResult.sorted.length) {
      if (leftResult.sorted[i] <= rightResult.sorted[j]) {
        merged.push(leftResult.sorted[i++]);
      } else {
        merged.push(rightResult.sorted[j++]);
      }
    }
    while (i < leftResult.sorted.length) merged.push(leftResult.sorted[i++]);
    while (j < rightResult.sorted.length) merged.push(rightResult.sorted[j++]);

    var mergeId = buildNode(merged.join(','), 'merged');
    var mergeNode = findNode(mergeId);
    mergeNode.children = [leftResult.nodeId, rightResult.nodeId];

    events.push({
      type: 'merge',
      level: level,
      left: leftResult.sorted.slice(),
      right: rightResult.sorted.slice(),
      merged: merged.slice(),
      treeNodes: JSON.parse(JSON.stringify(treeNodes))
    });

    findNode(mergeId).state = 'default';

    return { sorted: merged, nodeId: mergeId };
  }

  var result = pmergesort(A.slice(), 0);

  var n = A.length;
  var logN = Math.ceil(Math.log2(n || 1));

  events.push({
    type: 'done',
    result: result.sorted.slice(),
    work: n * logN,
    span: logN * logN,
    workBig: 'O(n log n)',
    spanBig: 'O(log\u00B2 n)',
    treeNodes: JSON.parse(JSON.stringify(treeNodes))
  });

  return events;
};

/* ---- Parallel Quicksort ---- */
AlgoVis.runParallelQuicksort = function (A) {
  var events = [];
  var nodeId = 0;
  var treeNodes = [];

  events.push({ type: 'init', array: A.slice() });

  function buildNode(label, state) {
    var id = 'n' + (nodeId++);
    treeNodes.push({ id: id, label: label, state: state || 'default', children: [] });
    return id;
  }

  function findNode(id) {
    for (var i = 0; i < treeNodes.length; i++) {
      if (treeNodes[i].id === id) return treeNodes[i];
    }
    return null;
  }

  function pquicksort(arr, level) {
    if (arr.length <= 1) {
      var leafId = buildNode(arr.length === 0 ? '[]' : String(arr[0]), 'active');
      events.push({
        type: 'base',
        level: level,
        array: arr.slice(),
        treeNodes: JSON.parse(JSON.stringify(treeNodes))
      });
      findNode(leafId).state = 'default';
      return { sorted: arr.slice(), nodeId: leafId };
    }

    // Pick pivot (median of first, mid, last)
    var pivot = arr[Math.floor(arr.length / 2)];

    // Filter into L, E, R
    var L = [], E = [], R = [];
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] < pivot) L.push(arr[i]);
      else if (arr[i] === pivot) E.push(arr[i]);
      else R.push(arr[i]);
    }

    var pivotId = buildNode('p=' + pivot, 'active');

    events.push({
      type: 'pivot',
      level: level,
      array: arr.slice(),
      pivot: pivot,
      left: L.slice(),
      equal: E.slice(),
      right: R.slice(),
      treeNodes: JSON.parse(JSON.stringify(treeNodes))
    });

    findNode(pivotId).state = 'default';

    var leftResult = pquicksort(L, level + 1);
    var rightResult = pquicksort(R, level + 1);

    var sorted = leftResult.sorted.concat(E).concat(rightResult.sorted);

    var joinId = buildNode(sorted.length <= 4 ? sorted.join(',') : sorted.length + ' els', 'merged');
    var joinNode = findNode(joinId);
    joinNode.children = [leftResult.nodeId, pivotId, rightResult.nodeId];

    events.push({
      type: 'combine',
      level: level,
      left: leftResult.sorted.slice(),
      equal: E.slice(),
      right: rightResult.sorted.slice(),
      result: sorted.slice(),
      treeNodes: JSON.parse(JSON.stringify(treeNodes))
    });

    findNode(joinId).state = 'default';

    return { sorted: sorted, nodeId: joinId };
  }

  var result = pquicksort(A.slice(), 0);

  var n = A.length;
  var logN = Math.ceil(Math.log2(n || 1));

  events.push({
    type: 'done',
    result: result.sorted.slice(),
    work: n * logN,
    span: logN * logN,
    workBig: 'O(n log n) expected',
    spanBig: 'O(log\u00B2 n) expected',
    treeNodes: JSON.parse(JSON.stringify(treeNodes))
  });

  return events;
};
