# CS 141 Algorithm Visualizer — Design Spec

## Purpose

Interactive browser-based study tool for CS 141 final exam. Visualizes every algorithm covered in class with step-by-step playback, detailed explanations, and verified pseudocode. Designed to help practice on the UCR campus graph from HW4/5 and other preset inputs.

## Architecture

### Approach: Vanilla JS with Classic Script Tags

No build tools. Opens directly via `file://` or GitHub Pages. Shared modules loaded via `<script>` tag ordering.

### File Structure

```
algo-visualizer/
├── index.html                          # Landing page with cards for each visualizer
├── shared/
│   ├── style.css                       # Dark theme, layout, components
│   ├── graph-renderer.js               # Canvas: vertices, edges, labels, state-based coloring
│   ├── table-renderer.js               # DP table: cell-by-cell fill, highlights, dependency arrows
│   ├── tree-renderer.js                # Binary trees: Huffman, fork-join
│   └── controls.js                     # Step/back/play/pause/reset/speed/keyboard shortcuts
├── dijkstra/
│   ├── index.html
│   ├── algo.js                         # Pure event generator
│   ├── ui.js                           # DOM wiring, sidebar, step explanations
│   └── presets.js                      # UCR map, simple, dense graphs
├── bellman-ford/
│   ├── index.html
│   ├── algo.js
│   ├── ui.js
│   └── presets.js
├── floyd-warshall/
│   ├── index.html
│   ├── algo.js
│   ├── ui.js
│   └── presets.js
├── mst/
│   ├── index.html
│   ├── algo-kruskal.js
│   ├── algo-prim.js
│   ├── ui.js
│   └── presets.js
├── dp/
│   ├── index.html
│   ├── algo-knapsack.js
│   ├── algo-lcs.js
│   ├── algo-lis.js
│   ├── algo-edit-distance.js
│   ├── ui.js
│   └── presets.js
├── huffman/
│   ├── index.html
│   ├── algo.js
│   ├── ui.js
│   └── presets.js
├── parallel/
│   ├── index.html
│   ├── algo-reduce.js
│   ├── algo-prefix-sum.js
│   ├── algo-filter.js
│   ├── algo-mergesort.js
│   ├── ui.js
│   └── presets.js
└── docs/superpowers/specs/
    └── this file
```

## Core Design Pattern: Pre-Computed Event Playback

Every algorithm follows the same pattern:

1. `algo.js` — pure function, zero DOM knowledge. Takes input, returns `Event[]`.
2. `controls.js` — manages `currentIndex` into event array. Handles step/back/play/reset.
3. `ui.js` — receives events via callback, updates sidebar and renderers.

### Why Pre-Computed Events

The previous implementation used a live state machine with phases (`extract`, `relax`, `done`) and mutable state. This caused bugs:
- extractMin used `<` instead of `<=`, skipping Infinity-distance vertices
- Algorithm terminated early, leaving vertices disconnected
- Step-back required deep-cloning entire state objects

Pre-computed events eliminate all of this:
- Algorithm runs to completion first — bugs produce obviously wrong event lists
- Step forward = increment index
- Step back = decrement index, replay events 0..index to reconstruct state
- No mutable state machine

### controls.js API

```
createPlayer(events, onEvent) → { step, back, play, pause, reset, jumpTo }
```

- `onEvent(event, index, total)` — called on every index change
- Binds to DOM buttons: stepBtn, backBtn, autoBtn, resetBtn, speedSlider
- Keyboard: ArrowRight/Space = step, ArrowLeft = back, R = reset, P = play/pause, +/- = speed

**Performance note:** Step-back replays events 0..index which is O(index). For the largest
visualizer (Floyd-Warshall on 8 vertices = ~512 events), this is negligible. For larger
inputs this could be optimized with periodic snapshots, but is not needed for our preset sizes.

**Indexing note:** All algorithm pseudocode uses 1-indexed arrays to match course materials.
JavaScript implementation uses 0-indexed arrays internally but displays 1-indexed labels.

## Shared Renderers

### graph-renderer.js

Used by: Dijkstra, Bellman-Ford, Floyd-Warshall, MST

```
renderGraph(ctx, {
  vertices: [{ id, label, x, y, state: 'default'|'active'|'finalized' }],
  edges: [{ u, v, w, state: 'default'|'spt'|'mst'|'relaxing'|'relaxFail'|'negative'|'considering'|'rejected' }],
  distLabels: { vertexId: 'string' }
})
```

- Auto-scales positions to canvas size with padding
- Vertex colors: gray (default), blue (active/current), green (finalized)
- Edge colors: dark gray (default), green (in SPT/MST), yellow (relaxing), red (failed/negative)
- Glow effect on active vertex
- Weight labels offset perpendicular to edge

### table-renderer.js

Used by: DP algorithms, Bellman-Ford DP view, Floyd-Warshall

```
renderTable(container, {
  rows: ['label'...],
  cols: ['label'...],
  cells: [[{ value, state: 'empty'|'computing'|'filled'|'dependency' }]],
  formula: 'string showing current recurrence'
})
```

- Highlights current cell being computed (blue)
- Highlights dependency cells (yellow)
- Flash animation on newly filled cells
- Formula bar shows the recurrence being evaluated

### tree-renderer.js

Used by: Huffman, Parallel algorithms

```
renderTree(ctx, {
  nodes: [{ id, label, children: [id, id], state: 'default'|'active'|'merged' }],
  edgeLabels: { 'parentId-childId': 'label' }
})
```

- Auto-layout from tree structure
- Huffman: edge labels 0/1, node labels show frequency
- Parallel: node labels show values, edges show operations

## Algorithm Specifications

All pseudocode verified against course materials (review slides, HW, practice exams) and external sources (cp-algorithms.com, programiz.com, geeksforgeeks.org).

### Dijkstra's Algorithm

**Event types:** `init`, `extract`, `relax`, `relax-skip`, `done`

```
Dijkstra(G, s):
  for each v: d[v] = INF, parent[v] = nil
  d[s] = 0
  PQ = all vertices with priority d[v]
  while PQ not empty:
    u = extractMin(PQ)
    mark u as finalized
    for each neighbor v of u:
      if v is already finalized: skip   ← optimization, not required for correctness
      if d[u] + w(u,v) < d[v]:
        d[v] = d[u] + w(u,v)
        parent[v] = u
        decreaseKey(PQ, v, d[v])
```

Note: The course's final practice exam (Q5) relaxes ALL neighbors without filtering.
The `min(d[v], d[u] + w(u,v))` naturally handles finalized vertices since their
distance cannot improve. Skipping finalized vertices is an optimization only.

- Time: O(m log n) with heap
- Relaxation attempts: m for directed graphs, 2m for undirected graphs (each undirected
  edge is examined from both endpoints). HW5 counts even unsuccessful attempts.
- Negative edge toggle: adds negative edge, shows wrong result with explanation

**Sidebar:** Step explanation with relaxation math, PQ contents, distance table, pseudocode with active line, relaxation counter.

### Bellman-Ford Algorithm

**Event types:** `init`, `round-start`, `relax`, `relax-fail`, `round-end`, `negative-cycle-check`, `done`

Note: Both successful and unsuccessful relaxation attempts generate events.
HW5 explicitly requires counting all relaxation attempts, not just successful ones.

```
BellmanFord(G, s):
  for each v: d[v] = INF
  d[s] = 0
  for k = 1 to n-1:
    for each edge (u, v, w) in E:
      if d[u] + w < d[v]:
        d[v] = d[u] + w
        parent[v] = u
    (if no update this round, break early)
  // Negative cycle detection
  for each edge (u, v, w) in E:
    if d[u] + w < d[v]:
      NEGATIVE CYCLE EXISTS
```

- Time: O(nm)
- Relaxations: (n-1)*m worst case
- DP view: D[i,k] = min(D[i,k-1], min over (j,i) in E of D[j,k-1] + w(j,i))

**Sidebar:** Round number, relaxation math, distance table with round-by-round history, comparison counter vs Dijkstra's for same graph.

### Floyd-Warshall Algorithm

**Event types:** `init`, `phase-start`, `update`, `phase-end`, `done`

```
FloydWarshall(G):
  for each i,j: d[i][j] = INF
  for each edge (i,j,w): d[i][j] = w
  for each v: d[v][v] = 0
  for k = 1 to n:           ← OUTERMOST (critical)
    for i = 1 to n:
      for j = 1 to n:
        d[i][j] = min(d[i][j], d[i][k] + d[k][j])
```

- Time: O(n^3)
- DP meaning: after phase k, d[i][j] = shortest path using vertices {1..k} as intermediates

**Sidebar:** Current phase k highlighted, n*n table showing all-pairs distances, formula showing d[i][j] = min(d[i][j], d[i][k] + d[k][j]) with current values.

### Kruskal's Algorithm

**Event types:** `init`, `sort`, `consider-edge`, `accept-edge`, `reject-edge`, `done`

```
Kruskal(G):
  sort edges by weight ascending
  T = empty set
  for each vertex v: makeSet(v)
  for each edge (u, v, w) in sorted order:
    if findSet(u) != findSet(v):
      T = T ∪ {(u,v,w)}
      union(u, v)
    else:
      skip (would create cycle)
  return T
```

- Time: O(m log n)
- Uses union-find

**Sidebar:** Sorted edge list with current edge highlighted, component membership display, accept/reject explanation, MST total weight running sum.

### Prim's Algorithm

**Event types:** `init`, `extract`, `consider-edge`, `relax`, `relax-skip`, `done`

Note: Each edge examination gets its own event (consider-edge), not just the
successful key updates. This matches the granularity of the HW4 Prim's step table.

```
Prim(G, start):
  for each v: key[v] = INF, parent[v] = nil
  key[start] = 0
  PQ = all vertices with priority key[v]
  while PQ not empty:
    u = extractMin(PQ)
    for each unvisited neighbor v of u:
      if w(u,v) < key[v]:          ← just w(u,v), NOT key[u]+w(u,v)
        key[v] = w(u,v)
        parent[v] = u
        decreaseKey(PQ, v, key[v])
```

- Time: O(m log n) with heap, O(n^2) with array
- CRITICAL: relaxation uses w(u,v), not key[u]+w(u,v) — this is the key difference from Dijkstra's

**Sidebar:** Same layout as Dijkstra but with "key" instead of "dist", explicit callout of the Prim vs Dijkstra relaxation difference.

### MST Page

Prim's and Kruskal's share a page with a toggle to switch between them. Same graph, same presets. This lets you compare how they build the same MST differently.

### Huffman Coding

**Event types:** `init`, `extract-two`, `merge`, `done`

```
Huffman(chars, freqs):
  PQ = min-priority queue of leaf nodes
  while PQ.size > 1:
    x = extractMin(PQ)
    y = extractMin(PQ)
    z = new node, freq = x.freq + y.freq
    z.left = x, z.right = y
    insert z into PQ
  return root
```

**Sidebar:** PQ contents, tree growing step by step, final code table, total code length calculation.

**Presets:** "forretress" (HW2), "abracadabra" (final practice, total length = 23).

### DP Algorithms

All share a page with tabs: Knapsack (0/1 + Unbounded), LCS, LIS, Edit Distance.

#### 0/1 Knapsack
**Event types:** `init`, `fill-cell`, `done`

```
for i = 0 to n: for j = 0 to W: DP[i][j] = 0
for i = 1 to n:
  for j = 0 to W:
    DP[i][j] = DP[i-1][j]
    if j >= weight[i]:
      DP[i][j] = max(DP[i][j], DP[i-1][j-weight[i]] + value[i])
return DP[n][W]
```

State: DP[i][j] = max value using first i items with weight limit j.

**Important sidebar note:** 0/1 knapsack uses DP[i-1][j-w_i] (previous row) because each
item can be used at most once. Unbounded knapsack uses DP[i] (current row) because items
are reusable. This is the key difference between the two variants.

#### Unbounded Knapsack
```
s[0] = 0
for i = 1 to W:
  s[i] = 0
  for each item (wj, vj):
    if i >= wj: s[i] = max(s[i], s[i-wj] + vj)
return s[W]
```

State: s[i] = max value with weight limit i (items reusable).

#### LCS
```
for i = 0 to m: LCS[i][0] = 0
for j = 0 to n: LCS[0][j] = 0
for i = 1 to m:
  for j = 1 to n:
    if X[i] == Y[j]: LCS[i][j] = LCS[i-1][j-1] + 1
    else: LCS[i][j] = max(LCS[i-1][j], LCS[i][j-1])
return LCS[m][n]
```

State: LCS[i][j] = LCS length of X[1..i] and Y[1..j].

#### Edit Distance
```
for i = 0 to m: ed[i][0] = i
for j = 0 to n: ed[0][j] = j
for i = 1 to m:
  for j = 1 to n:
    if X[i] == Y[j]: ed[i][j] = ed[i-1][j-1]
    else: ed[i][j] = 1 + min(ed[i-1][j], ed[i][j-1], ed[i-1][j-1])
return ed[m][n]
```

State: ed[i][j] = min edits to transform X[1..i] into Y[1..j].

#### LIS
```
for i = 1 to n: dp[i] = 1
for i = 1 to n:
  for j = 1 to i-1:
    if A[j] < A[i]: dp[i] = max(dp[i], dp[j] + 1)
return max over all i of dp[i]
```

State: dp[i] = LIS length ending at position i.

**Sidebar for all DP:** Formula bar showing current recurrence with values substituted, table with cell highlighting and dependency arrows, state explanation.

### Parallel Algorithms

Tabs: Reduce, Prefix Sum, Filter, Quicksort, Merge Sort.

#### Reduce
```
reduce(A, n):
  if n == 1: return A[0]
  in parallel:
    L = reduce(A[1..n/2])
    R = reduce(A[n/2+1..n])
  return L + R
```
Work: O(n). Span: O(log n).

#### Prefix Sum
```
PrefixSum(In[1..n]):
  if n == 1: Out[1] = In[1]; return
  parallel_for i = 1 to n/2:
    B[i] = In[2i-1] + In[2i]
  C = PrefixSum(B[1..n/2])
  Out[1] = In[1]
  parallel_for i = 2 to n:
    if i is even: Out[i] = C[i/2]
    if i is odd:  Out[i] = C[(i-1)/2] + In[i]
```
Work: O(n). Span: O(log^2 n).

#### Filter/Pack
```
Filter(A, n, f):
  parallel_for i = 1 to n: flag[i] = f(A[i])
  ps = PrefixSum(flag)
  parallel_for i = 1 to n:
    if flag[i]: B[ps[i]] = A[i]
  return B
```
Work: O(n). Span: O(log^2 n).

#### Parallel Quicksort
```
pqsort(A, n):
  pivot = A[random]
  L = filter(A, x < pivot)
  R = filter(A, x > pivot)
  in parallel: pqsort(L); pqsort(R)
```
Work: O(n log n) expected. Span: O(log^2 n) expected.

#### Parallel Merge Sort
```
pmergesort(A, n):
  if n == 1: return A
  in parallel:
    L = pmergesort(A[1..n/2])
    R = pmergesort(A[n/2+1..n])
  return parallel_merge(L, R)
```
Work: O(n log n). Span: O(log^2 n).
Note: Uses parallel merge (O(n) work, O(log n) span) instead of sequential merge.
Covered in final practice exam question 4.

**Visualization:** Fork-join tree showing parallel execution, work/span counters at each level.

## Preset Data

### Shared Graph Presets (Dijkstra, Bellman-Ford, Floyd-Warshall, MST)

**UCR Map (HW4/5):** 8 vertices, 12 undirected edges, source = vertex 7 (Winston Chung Hall)

**All edges are undirected (bidirectional).** When building adjacency lists, each edge
(u,v,w) must be added in BOTH directions: adj[u] gets (v,w) and adj[v] gets (u,w).

```
Vertices: 1-Bourns, 2-Bookstore, 3-Pierce, 4-HUB, 5-Bell Tower, 6-Greenhouse, 7-Winston, 8-Library
Edges: (1,2,3) (1,5,9) (1,6,14) (1,7,1) (2,3,4) (2,5,5) (3,4,2) (4,5,6) (4,6,8) (4,8,7) (6,7,17) (6,8,15)
```

**Simple:** 5 vertices (A-E), 7 edges, source = A
**Dense:** 6 vertices (S,A,B,C,D,T), 9 edges, source = S

### Negative Edge Presets
Each graph preset has a corresponding negative edge that demonstrates Dijkstra's failure.

### DP Presets
- Knapsack: items from HW3 (students on plane)
- LCS: sequences from review slides (ABCBDAB, BDCABA)
- LIS: sequence from midterm 2 practice
- Edit Distance: short string pair for clear visualization

### Huffman Presets
- "forretress" (HW2)
- "abracadabra" (final practice, answer = 23)

### Parallel Presets
- [1,2,3,4,5,6,7,8] for reduce/prefix sum
- [4,2,9,3,6,5,7,11,10,8] for filter (keep odds) and quicksort

## UI Layout

All pages share the same layout:
- **Header:** back button, algorithm name, tags (Greedy/DP/D&C/Parallel)
- **Left (70%):** Canvas (graph/tree) or Table view, controls bar below, legend + stats at bottom
- **Right sidebar (30%):** Preset selector, step explanation, data structure view (PQ/sorted edges/tree), distance/DP table, pseudocode with active line

## Verification Sources

- [Floyd-Warshall — cp-algorithms](https://cp-algorithms.com/graph/all-pair-shortest-path-floyd-warshall.html)
- [Dijkstra's — Programiz](https://www.programiz.com/dsa/dijkstra-algorithm)
- [Bellman-Ford — cp-algorithms](https://cp-algorithms.com/graph/bellman_ford.html)
- [Kruskal's — Programiz](https://www.programiz.com/dsa/kruskal-algorithm)
- [Prim's — GeeksforGeeks](https://www.geeksforgeeks.org/dsa/prims-minimum-spanning-tree-mst-greedy-algo-5/)
