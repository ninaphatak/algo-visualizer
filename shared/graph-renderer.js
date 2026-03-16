/* ============================================
   CS 141 Algorithm Visualizer — Graph Renderer
   ============================================ */

window.AlgoVis = window.AlgoVis || {};

AlgoVis.renderGraph = function (canvas, config) {
  var vertices = config.vertices || [];
  var edges = config.edges || [];
  var distLabels = config.distLabels || {};

  var ctx = canvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;
  var w = canvas.clientWidth;
  var h = canvas.clientHeight;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.clearRect(0, 0, w, h);

  if (vertices.length === 0) return;

  // --- Scale & center vertices to fit canvas ---
  var padding = 60;

  function getScaledPos() {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    vertices.forEach(function (v) {
      if (v.x < minX) minX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.x > maxX) maxX = v.x;
      if (v.y > maxY) maxY = v.y;
    });
    var rangeX = maxX - minX || 1;
    var rangeY = maxY - minY || 1;
    var scaleX = (w - 2 * padding) / rangeX;
    var scaleY = (h - 2 * padding) / rangeY;
    var scale = Math.min(scaleX, scaleY);
    var offsetX = (w - rangeX * scale) / 2;
    var offsetY = (h - rangeY * scale) / 2;

    var posMap = {};
    vertices.forEach(function (v) {
      posMap[v.id] = {
        x: (v.x - minX) * scale + offsetX,
        y: (v.y - minY) * scale + offsetY
      };
    });
    return posMap;
  }

  var pos = getScaledPos();

  // --- Edge styles ---
  var edgeStyles = {
    'default':     { color: '#2a2a4a', width: 2, dash: [] },
    'spt':         { color: '#4ade80', width: 3, dash: [] },
    'mst':         { color: '#4ade80', width: 3, dash: [] },
    'relaxing':    { color: '#fbbf24', width: 4, dash: [] },
    'relaxFail':   { color: '#f87171', width: 3, dash: [] },
    'negative':    { color: '#f87171', width: 2.5, dash: [6, 4] },
    'considering': { color: '#60a5fa', width: 3, dash: [] },
    'rejected':    { color: '#f87171', width: 2, dash: [] }
  };

  // --- Vertex styles ---
  var vertexStyles = {
    'default':   { fill: '#1a1a3a', stroke: '#555' },
    'active':    { fill: '#0a1a3a', stroke: '#60a5fa' },
    'finalized': { fill: '#0a2a15', stroke: '#4ade80' }
  };

  // --- Draw edge lines (below vertices) ---
  var arrowsToDraw = []; // collect arrows to draw AFTER vertices

  edges.forEach(function (edge) {
    var a = pos[edge.u];
    var b = pos[edge.v];
    if (!a || !b) return;

    var style = edgeStyles[edge.state] || edgeStyles['default'];

    ctx.save();
    ctx.beginPath();
    ctx.setLineDash(style.dash);
    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.width;
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();

    // Collect arrow data for later (drawn on top of vertices)
    if (config.directed) {
      arrowsToDraw.push({ a: a, b: b, style: style });
    }

    // Weight label
    if (edge.w !== undefined) {
      var mx = (a.x + b.x) / 2;
      var my = (a.y + b.y) / 2;

      // Offset perpendicular
      var dx = b.x - a.x;
      var dy = b.y - a.y;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var nx = -dy / len;
      var ny = dx / len;

      ctx.save();
      ctx.font = '12px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = style.color === '#2a2a4a' ? '#666' : style.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(edge.w), mx + nx * 14, my + ny * 14);
      ctx.restore();
    }
  });

  // --- Draw vertices ---
  var radius = 24;

  vertices.forEach(function (v) {
    var p = pos[v.id];
    if (!p) return;

    var style = vertexStyles[v.state] || vertexStyles['default'];

    // Glow for active
    if (v.state === 'active') {
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

    // Label (support \n for two-line labels)
    ctx.save();
    ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#e0e0e0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    var lines = String(v.label).split('\n');
    if (lines.length === 1) {
      ctx.fillText(lines[0], p.x, p.y);
    } else {
      ctx.fillText(lines[0], p.x, p.y - 7);
      ctx.font = '10px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(lines[1], p.x, p.y + 8);
    }
    ctx.restore();

    // Dist label above vertex
    var dist = distLabels[v.id];
    if (dist !== undefined) {
      ctx.save();
      ctx.font = '11px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = v.state === 'finalized' ? '#4ade80' : '#60a5fa';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(String(dist), p.x, p.y - radius - 6);
      ctx.restore();
    }
  });

  // --- Draw arrowheads ON TOP of vertices (so they're visible) ---
  arrowsToDraw.forEach(function (arrow) {
    var a = arrow.a;
    var b = arrow.b;
    var style = arrow.style;

    var dx = b.x - a.x;
    var dy = b.y - a.y;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var angle = Math.atan2(dy, dx);

    // Position arrow tip just outside the target circle
    var tipX = b.x - (dx / len) * (radius + 4);
    var tipY = b.y - (dy / len) * (radius + 4);
    var arrowLen = 12;
    var arrowAngle = Math.PI / 6;

    var arrowColor = style.color === '#2a2a4a' ? '#aaa' : style.color;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX - arrowLen * Math.cos(angle - arrowAngle), tipY - arrowLen * Math.sin(angle - arrowAngle));
    ctx.lineTo(tipX - arrowLen * Math.cos(angle + arrowAngle), tipY - arrowLen * Math.sin(angle + arrowAngle));
    ctx.closePath();
    ctx.fillStyle = arrowColor;
    ctx.fill();
    // Add outline for extra visibility
    ctx.lineWidth = 1;
    ctx.strokeStyle = arrowColor;
    ctx.stroke();
    ctx.restore();
  });
};
