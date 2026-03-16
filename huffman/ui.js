/* ============================================
   CS 141 Algorithm Visualizer — Huffman UI
   ============================================ */

(function () {
  var canvas = document.getElementById('treeCanvas');
  var stepInfo = document.getElementById('stepInfo');
  var pqDisplay = document.getElementById('pqDisplay');
  var freqBody = document.getElementById('freqBody');
  var codeSection = document.getElementById('codeSection');
  var codeBody = document.getElementById('codeBody');
  var totalLengthEl = document.getElementById('totalLength');
  var presetBtns = document.getElementById('presetBtns');
  var pseudocode = document.getElementById('pseudocode');

  var player = null;
  var currentFreqs = {};
  var currentRootId = null;

  // Build preset buttons
  AlgoVis.HUFFMAN_PRESETS.forEach(function (preset, idx) {
    var btn = document.createElement('button');
    btn.className = 'preset-btn' + (idx === 0 ? ' active' : '');
    btn.textContent = preset.name;
    btn.addEventListener('click', function () {
      var all = presetBtns.querySelectorAll('.preset-btn');
      for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
      btn.classList.add('active');
      loadPreset(preset.text);
    });
    presetBtns.appendChild(btn);
  });

  function loadPreset(text) {
    var events = AlgoVis.runHuffman(text);
    codeSection.style.display = 'none';
    currentRootId = null;
    if (player) player.pause();
    player = AlgoVis.createPlayer(events, onEvent);
  }

  function highlightLine(lineNum) {
    var lines = pseudocode.querySelectorAll('.line');
    for (var i = 0; i < lines.length; i++) {
      lines[i].classList.toggle('active', parseInt(lines[i].getAttribute('data-line'), 10) === lineNum);
    }
  }

  function renderPQ(pqItems) {
    pqDisplay.innerHTML = '';
    // pqItems already sorted by freq
    var sorted = pqItems.slice().sort(function (a, b) { return a.freq - b.freq; });
    sorted.forEach(function (item, idx) {
      var div = document.createElement('div');
      div.className = 'pq-item' + (idx === 0 ? ' min' : '');
      div.innerHTML = '<span>' + escHtml(item.label.replace('\n', ' : ')) + '</span><span>freq=' + item.freq + '</span>';
      pqDisplay.appendChild(div);
    });
  }

  function renderFreqTable(freqs, codes) {
    freqBody.innerHTML = '';
    var chars = Object.keys(freqs).sort();
    chars.forEach(function (c) {
      var tr = document.createElement('tr');
      var code = codes ? (codes[c] || '') : '';
      tr.innerHTML = '<td>' + escHtml(c) + '</td><td>' + freqs[c] + '</td><td style="font-family:monospace;">' + code + '</td>';
      freqBody.appendChild(tr);
    });
  }

  function buildEdgeLabels(treeNodes) {
    var labels = {};
    treeNodes.forEach(function (node) {
      if (node.children && node.children.length === 2) {
        labels[node.id + '-' + node.children[0]] = '0';
        labels[node.id + '-' + node.children[1]] = '1';
      }
    });
    return labels;
  }

  function findRoot(treeNodes) {
    // The root is the node that is not a child of any other node
    var childSet = {};
    treeNodes.forEach(function (n) {
      if (n.children) {
        n.children.forEach(function (cid) { childSet[cid] = true; });
      }
    });
    for (var i = treeNodes.length - 1; i >= 0; i--) {
      if (!childSet[treeNodes[i].id]) return treeNodes[i].id;
    }
    return treeNodes[0].id;
  }

  function renderTree(treeNodes) {
    var rootId = findRoot(treeNodes);
    AlgoVis.renderTree(canvas, {
      nodes: treeNodes,
      edgeLabels: buildEdgeLabels(treeNodes),
      rootId: rootId
    });
  }

  function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function onEvent(event, index) {
    switch (event.type) {
      case 'init':
        currentFreqs = event.freqs;
        renderFreqTable(event.freqs, null);
        renderPQ(event.pq);
        // Render leaf nodes (each is its own root for now — just clear canvas)
        var ctx = canvas.getContext('2d');
        var dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.clientWidth * dpr;
        canvas.height = canvas.clientHeight * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

        stepInfo.innerHTML = '<div class="step-title">Initialization</div>' +
          'Created leaf nodes for ' + Object.keys(event.freqs).length + ' characters. ' +
          'PQ contains ' + event.pq.length + ' nodes sorted by frequency.';
        highlightLine(1);
        codeSection.style.display = 'none';
        break;

      case 'extract-two':
        renderPQ(event.pq);
        stepInfo.innerHTML = '<div class="step-title">Extract Two Minimums</div>' +
          'Extracting: <span class="highlight">' + escHtml(event.node1.label.replace('\n', ' ')) +
          '</span> (freq=' + event.node1.freq + ') and <span class="highlight">' +
          escHtml(event.node2.label.replace('\n', ' ')) + '</span> (freq=' + event.node2.freq + ').';
        highlightLine(3);
        break;

      case 'merge':
        renderPQ(event.pq);
        renderTree(event.treeNodes);
        stepInfo.innerHTML = '<div class="step-title">Merge</div>' +
          'Merging into new node with freq=<span class="highlight">' + event.newNode.freq + '</span>. ' +
          'PQ now has ' + event.pq.length + ' node(s).';
        highlightLine(5);
        break;

      case 'done':
        currentRootId = event.rootId;
        // Reset all node states to merged (green) for final tree
        var finalNodes = event.treeNodes.map(function (n) {
          return { id: n.id, label: n.label, freq: n.freq, children: n.children, state: 'merged' };
        });
        AlgoVis.renderTree(canvas, {
          nodes: finalNodes,
          edgeLabels: buildEdgeLabels(finalNodes),
          rootId: event.rootId
        });

        renderFreqTable(currentFreqs, event.codes);

        // Show code table
        codeSection.style.display = '';
        codeBody.innerHTML = '';
        var chars = Object.keys(event.codes).sort();
        chars.forEach(function (c) {
          var tr = document.createElement('tr');
          tr.innerHTML = '<td>' + escHtml(c) + '</td>' +
            '<td style="font-family:monospace;">' + event.codes[c] + '</td>' +
            '<td>' + event.codes[c].length + '</td>';
          codeBody.appendChild(tr);
        });

        totalLengthEl.innerHTML = 'Total encoded length: <strong>' + event.totalLength + ' bits</strong>';

        stepInfo.innerHTML = '<div class="step-title">Done!</div>' +
          'Huffman tree complete. Total encoded length = <span class="highlight">' +
          event.totalLength + ' bits</span>.';
        highlightLine(7);
        break;
    }
  }

  // Load first preset
  loadPreset(AlgoVis.HUFFMAN_PRESETS[0].text);
})();
