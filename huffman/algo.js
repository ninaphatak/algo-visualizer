/* ============================================
   CS 141 Algorithm Visualizer — Huffman Coding
   ============================================ */

window.AlgoVis = window.AlgoVis || {};

AlgoVis.runHuffman = function (text) {
  var events = [];
  var nextId = 0;

  // Count character frequencies
  var freqs = {};
  for (var i = 0; i < text.length; i++) {
    var ch = text[i];
    freqs[ch] = (freqs[ch] || 0) + 1;
  }

  // Create leaf nodes
  var leaves = [];
  var chars = Object.keys(freqs).sort();
  for (var ci = 0; ci < chars.length; ci++) {
    var c = chars[ci];
    leaves.push({
      id: 'n' + (nextId++),
      label: c + '\n' + freqs[c],
      freq: freqs[c],
      children: null,
      state: 'default',
      char: c
    });
  }

  // Priority queue (simple array, extract min by scanning)
  var pq = leaves.slice();
  var allNodes = leaves.slice();

  function pqSnapshot(arr) {
    return arr.slice().sort(function (a, b) { return a.freq - b.freq || a.id.localeCompare(b.id); })
      .map(function (n) { return { id: n.id, label: n.label, freq: n.freq }; });
  }

  function treeSnapshot() {
    return allNodes.map(function (n) {
      return {
        id: n.id,
        label: n.label,
        freq: n.freq,
        children: n.children ? n.children.slice() : null,
        state: n.state
      };
    });
  }

  // Emit init
  events.push({
    type: 'init',
    freqs: JSON.parse(JSON.stringify(freqs)),
    pq: pqSnapshot(pq)
  });

  // Build Huffman tree
  while (pq.length > 1) {
    // Sort to find two minimums
    pq.sort(function (a, b) { return a.freq - b.freq || a.id.localeCompare(b.id); });

    var x = pq.shift();
    var y = pq.shift();

    // Emit extract-two
    events.push({
      type: 'extract-two',
      node1: { id: x.id, label: x.label, freq: x.freq },
      node2: { id: y.id, label: y.label, freq: y.freq },
      pq: pqSnapshot(pq)
    });

    // Merge
    var z = {
      id: 'n' + (nextId++),
      label: (x.freq + y.freq).toString(),
      freq: x.freq + y.freq,
      children: [x.id, y.id],
      state: 'default'
    };

    pq.push(z);
    allNodes.push(z);

    // Mark states for merge event
    var snapshot = treeSnapshot();
    // Mark the merged node and its children as active in the snapshot
    for (var si = 0; si < snapshot.length; si++) {
      if (snapshot[si].id === z.id || snapshot[si].id === x.id || snapshot[si].id === y.id) {
        snapshot[si].state = 'active';
      }
    }

    events.push({
      type: 'merge',
      newNode: { id: z.id, label: z.label, freq: z.freq, children: [x.id, y.id] },
      pq: pqSnapshot(pq),
      treeNodes: snapshot
    });

    // Reset states
    for (var ri = 0; ri < allNodes.length; ri++) {
      allNodes[ri].state = 'default';
    }
  }

  // Compute codes by traversing the tree
  var root = pq[0];
  var codes = {};

  function traverse(nodeId, prefix) {
    var node = null;
    for (var ti = 0; ti < allNodes.length; ti++) {
      if (allNodes[ti].id === nodeId) { node = allNodes[ti]; break; }
    }
    if (!node) return;

    if (!node.children) {
      // Leaf node
      codes[node.char] = prefix || '0'; // single char edge case
    } else {
      traverse(node.children[0], prefix + '0');
      traverse(node.children[1], prefix + '1');
    }
  }

  traverse(root.id, '');

  // Compute total length
  var totalLength = 0;
  var codeChars = Object.keys(codes);
  for (var li = 0; li < codeChars.length; li++) {
    totalLength += freqs[codeChars[li]] * codes[codeChars[li]].length;
  }

  events.push({
    type: 'done',
    treeNodes: treeSnapshot(),
    rootId: root.id,
    codes: codes,
    totalLength: totalLength
  });

  return events;
};
