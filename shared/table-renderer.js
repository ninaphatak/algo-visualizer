/* ============================================
   CS 141 Algorithm Visualizer — Table Renderer
   ============================================ */

window.AlgoVis = window.AlgoVis || {};

AlgoVis.renderTable = function (container, config) {
  var rows = config.rows || [];
  var cols = config.cols || [];
  var cells = config.cells || [];
  var formula = config.formula || '';

  var html = '';

  // Formula bar
  if (formula) {
    html += '<div class="formula-bar">' + escapeHtml(formula) + '</div>';
  }

  // Table
  html += '<table class="dist-table">';

  // Header row
  html += '<tr><th></th>';
  cols.forEach(function (col) {
    html += '<th>' + escapeHtml(col) + '</th>';
  });
  html += '</tr>';

  // Data rows
  rows.forEach(function (rowLabel, r) {
    html += '<tr>';
    html += '<th>' + escapeHtml(rowLabel) + '</th>';
    cols.forEach(function (_, c) {
      var cell = (cells[r] && cells[r][c]) || { value: '', state: 'empty' };
      var cls = '';
      switch (cell.state) {
        case 'empty':      cls = 'style="color:#555"'; break;
        case 'computing':  cls = 'style="background:rgba(96,165,250,0.15);color:#60a5fa;font-weight:600"'; break;
        case 'filled':     cls = ''; break;
        case 'dependency': cls = 'style="background:rgba(251,191,36,0.15);color:#fbbf24"'; break;
      }
      html += '<td ' + cls + '>' + escapeHtml(String(cell.value)) + '</td>';
    });
    html += '</tr>';
  });

  html += '</table>';

  container.innerHTML = html;

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};
