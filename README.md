# CS 141 Algorithm Visualizer

Interactive study tools for the CS 141 final exam. Step through classic algorithms, watch state evolve, and inspect data structures cell by cell.

**Live site:** https://ninaphatak.github.io/algo-visualizer/

## Visualizers

| Algorithm | Category | What it shows |
|---|---|---|
| [Dijkstra's Algorithm](dijkstra/) | Greedy | SSSP with relaxations, priority queue state, and negative-edge failure mode |
| [Bellman-Ford](bellman-ford/) | DP | SSSP with negative edges and negative-cycle detection |
| [Prim's & Kruskal's](mst/) | Greedy | MST construction with cut-property visualization |
| [Floyd-Warshall](floyd-warshall/) | DP | All-pairs shortest paths with DP matrix |
| [DP Table Explorer](dp/) | DP | Knapsack, LCS, LIS, and edit distance tables filling cell by cell |
| [Huffman Coding](huffman/) | Greedy | Tree construction and code generation from typed text |
| [Parallel Algorithms](parallel/) | Parallel | Fork-join, reduce, prefix sum, filter, and parallel mergesort |

## Running locally

It's a static site — no build step. Open `index.html` directly, or serve the directory:

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000.

## Layout

```
index.html          Landing page with cards linking to each visualizer
<algo>/             Per-algorithm folder: index.html + algo.js + ui.js
shared/             Reusable renderers (graph, tree, table) and controls
```
