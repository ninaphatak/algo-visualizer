/* ============================================
   CS 141 Algorithm Visualizer — Tree Renderer
   ============================================ */

window.AlgoVis = window.AlgoVis || {};

AlgoVis.renderTree = function (canvas, config) {
  var nodes = config.nodes || [];
  var edgeLabels = config.edgeLabels || {};
  var rootId = config.rootId;

  var ctx = canvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;
  var w = canvas.clientWidth;
  var h = canvas.clientHeight;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  if (nodes.length === 0) return;

  // Build node map
  var nodeMap = {};
  nodes.forEach(function (n) { nodeMap[n.id] = n; });

  var root = nodeMap[rootId];
  if (!root) return;

  // --- BFS layout ---
  var levels = [];
  var posMap = {};
  var visited = {};

  var queue = [{ id: rootId, depth: 0 }];
  visited[rootId] = true;

  while (queue.length > 0) {
    var item = queue.shift();
    var node = nodeMap[item.id];
    if (!node) continue;

    if (!levels[item.depth]) levels[item.depth] = [];
    levels[item.depth].push(item.id);

    var children = node.children || [];
    children.forEach(function (childId) {
      if (childId !== null && childId !== undefined && nodeMap[childId] && !visited[childId]) {
        visited[childId] = true;
        queue.push({ id: childId, depth: item.depth + 1 });
      }
    });
  }

  // Assign positions
  var padding = 50;
  var levelHeight = (h - 2 * padding) / Math.max(levels.length - 1, 1);

  levels.forEach(function (ids, depth) {
    var count = ids.length;
    var spacing = (w - 2 * padding) / (count + 1);
    ids.forEach(function (id, i) {
      posMap[id] = {
        x: padding + spacing * (i + 1),
        y: padding + depth * levelHeight
      };
    });
  });

  // --- Node styles ---
  var nodeStyles = {
    'default': { fill: '#1a1a3a', stroke: '#555' },
    'active':  { fill: '#0a1a3a', stroke: '#60a5fa' },
    'merged':  { fill: '#0a2a15', stroke: '#4ade80' }
  };

  var radius = 24;

  // --- Draw edges ---
  nodes.forEach(function (node) {
    var parentPos = posMap[node.id];
    if (!parentPos) return;

    var children = node.children || [];
    children.forEach(function (childId) {
      if (childId === null || childId === undefined) return;
      var childPos = posMap[childId];
      if (!childPos) return;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(parentPos.x, parentPos.y);
      ctx.lineTo(childPos.x, childPos.y);
      ctx.strokeStyle = '#2a2a4a';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Edge label
      var key = node.id + '-' + childId;
      var label = edgeLabels[key];
      if (label) {
        var mx = (parentPos.x + childPos.x) / 2;
        var my = (parentPos.y + childPos.y) / 2;
        ctx.save();
        ctx.font = '11px "Segoe UI", system-ui, sans-serif';
        ctx.fillStyle = '#888';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(label), mx + 12, my);
        ctx.restore();
      }
    });
  });

  // --- Draw nodes ---
  nodes.forEach(function (node) {
    var p = posMap[node.id];
    if (!p) return;

    var style = nodeStyles[node.state] || nodeStyles['default'];

    // Glow for active
    if (node.state === 'active') {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius + 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(96, 165, 250, 0.15)';
      ctx.fill();
      ctx.restore();
    }

    // Circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = style.fill;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = style.stroke;
    ctx.stroke();
    ctx.restore();

    // Label
    ctx.save();
    ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#e0e0e0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    var lines = String(node.label).split('\n');
    if (lines.length === 1) {
      ctx.fillText(lines[0], p.x, p.y);
    } else {
      ctx.fillText(lines[0], p.x, p.y - 7);
      ctx.font = '10px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(lines[1], p.x, p.y + 8);
    }
    ctx.restore();
  });
};
