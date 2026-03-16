/* ============================================
   CS 141 Algorithm Visualizer — DP Presets
   ============================================ */

window.AlgoVis = window.AlgoVis || {};

AlgoVis.DP_PRESETS = {
  knapsack01: { name: '0/1 Knapsack', items: [{w:2,v:3,name:'A'},{w:3,v:4,name:'B'},{w:4,v:5,name:'C'},{w:5,v:6,name:'D'}], W: 8 },
  knapsackUnbounded: { name: 'Unbounded', items: [{w:2,v:3,name:'A'},{w:3,v:4,name:'B'},{w:4,v:5,name:'C'}], W: 8 },
  lcs: { name: 'LCS', X: 'ABCBDAB', Y: 'BDCABA' },
  editDistance: { name: 'Edit Distance', X: 'KITTEN', Y: 'SITTING' },
  lis: { name: 'LIS', A: [2, 3, 5, 4, 1, 5, 3, 4, 5, 1] }
};
