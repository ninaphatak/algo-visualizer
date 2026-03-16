/* ============================================
   CS 141 Algorithm Visualizer — Parallel Reduce
   ============================================ */

window.AlgoVis = window.AlgoVis || {};

AlgoVis.runReduce = function (A) {
  var events = [];
  var work = 0;
  var span = 0;
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

  function reduce(arr, indices, level) {
    var n = arr.length;

    if (n === 1) {
      work++;
      var leafId = buildNode(String(arr[0]), 'active');
      events.push({
        type: 'compute',
        level: level,
        index: indices[0],
        value: arr[0],
        treeNodes: JSON.parse(JSON.stringify(treeNodes))
      });
      return { value: arr[0], nodeId: leafId };
    }

    var mid = Math.floor(n / 2);
    var leftArr = arr.slice(0, mid);
    var rightArr = arr.slice(mid);
    var leftIdx = indices.slice(0, mid);
    var rightIdx = indices.slice(mid);

    events.push({
      type: 'fork',
      level: level,
      left: leftIdx.slice(),
      right: rightIdx.slice(),
      treeNodes: JSON.parse(JSON.stringify(treeNodes))
    });

    span++;

    var leftResult = reduce(leftArr, leftIdx, level + 1);
    var rightResult = reduce(rightArr, rightIdx, level + 1);

    var result = leftResult.value + rightResult.value;
    work++;

    var joinId = buildNode(String(result), 'merged');
    var joinNode = findNode(joinId);
    joinNode.children = [leftResult.nodeId, rightResult.nodeId];

    // Mark children as default now
    var ln = findNode(leftResult.nodeId);
    var rn = findNode(rightResult.nodeId);
    if (ln) ln.state = 'default';
    if (rn) rn.state = 'default';

    events.push({
      type: 'join',
      level: level,
      leftVal: leftResult.value,
      rightVal: rightResult.value,
      result: result,
      index: indices[0],
      treeNodes: JSON.parse(JSON.stringify(treeNodes))
    });

    return { value: result, nodeId: joinId };
  }

  var indices = [];
  for (var i = 0; i < A.length; i++) indices.push(i);

  var result = reduce(A.slice(), indices, 0);

  events.push({
    type: 'done',
    result: result.value,
    work: work,
    span: Math.ceil(Math.log2(A.length)),
    treeNodes: JSON.parse(JSON.stringify(treeNodes))
  });

  return events;
};
