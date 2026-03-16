# CS 141 Algorithm Visualizer Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build interactive browser-based visualizers for all CS 141 algorithms with step-by-step playback, verified pseudocode, and detailed explanations.

**Architecture:** Vanilla JS with classic `<script>` tag loading. Pre-computed event arrays for every algorithm (no live state machines). Three shared renderers (graph, table, tree) and one shared controls module. Each algorithm page has: pure algo.js, UI-wiring ui.js, preset data presets.js, and an HTML shell.

**Tech Stack:** Vanilla JS, HTML Canvas, CSS. No build tools. Opens via `file://` or GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-03-16-algo-visualizer-design.md`

**Priority order:** Shared foundation > Dijkstra > Bellman-Ford > MST > Floyd-Warshall > DP > Huffman > Parallel. This front-loads graph algorithms (professor emphasized graphs + DP for the final).

---

## Chunk 1: Shared Foundation

### Task 1: Shared CSS (`shared/style.css`)

**Files:**
- Create: `shared/style.css`

- [ ] **Step 1: Create the shared stylesheet**

All pages use the same dark theme. This file contains: reset, body, header bar, main grid layout (70/30 split), controls bar, sidebar sections, buttons, distance table, PQ display, pseudocode panel, legend, step-info box, preset buttons, toggle switches, formula bar, tabs.

Colors:
- Background: `#0a0a1a`, panels: `#12122a`, borders: `#1a1a3a` / `#2a2a4a`
- Active/current: `#60a5fa` (blue)
- Finalized/success: `#4ade80` (green)
- Relaxing/warning: `#fbbf24` (yellow)
- Fail/negative: `#f87171` (red)
- Greedy tag: green, DP tag: yellow, D&C tag: purple, Parallel tag: blue

Layout:
- `.header` — flex row: back button, h1 (gradient text), tags
- `.main` — CSS grid: `1fr 360px` (canvas area | sidebar)
- `.graph-area` — flex column: controls bar, canvas (flex:1), legend+stats
- `.sidebar` — flex column of `.sidebar-section` blocks, overflow-y auto
- `.controls` — flex row: step/auto/back/reset buttons, speed slider right-aligned
- `.btn`, `.btn.primary`, `.btn.danger`, `.btn:disabled` — button styles
- `.dist-table` — full-width table with status coloring
- `.pq-items` / `.pq-item` — flex-wrap badges for PQ contents
- `.pseudocode` / `.pseudocode .line` / `.pseudocode .line.active` — monospace code block
- `.step-info` — explanation panel with `.step-title`, `.highlight`, `.relax-detail`
- `.preset-btns` / `.preset-btn` / `.preset-btn.active` — graph selector buttons
- `.tabs` / `.tab` / `.tab.active` — tab switcher for DP/parallel pages
- `.formula-bar` — monospace bar showing current recurrence
- `.legend` / `.legend-item` / `.legend-dot` / `.legend-line` — color legend
- `.toggle-row` / `.toggle` / `.toggle-label` — switch for negative edge
- `@keyframes flashUpdate` — cell flash animation
- `@keyframes flashGreen` — success flash

- [ ] **Step 2: Commit**

```bash
git add shared/style.css
git commit -m "feat: add shared stylesheet for all visualizer pages"
```

---

### Task 2: Shared Controls (`shared/controls.js`)

**Files:**
- Create: `shared/controls.js`

- [ ] **Step 1: Implement createPlayer**

Exposes global `AlgoVis.createPlayer(events, onEvent)` which returns `{ step, back, play, pause, reset, jumpTo }`.

Implementation:
- `currentIndex` starts at -1 (before first event). Events array stored in closure.
- `step()`: if index < events.length - 1, increment, call `onEvent(events[index], index, events.length)`. Update button disabled states.
- `back()`: if index > 0, decrement, call `onEvent(events[index], index, events.length)`. If index === 0, show init state.
- `play()`: setInterval calling step() at current speed. Change auto button to pause style.
- `pause()`: clearInterval. Restore auto button.
- `reset()`: index = 0, call `onEvent(events[0], 0, events.length)`.
- `jumpTo(i)`: set index = i, call onEvent.
- Speed: read from `#speedSlider` value. On slider change, if playing, restart interval.
- Bind DOM: `#stepBtn`, `#backBtn`, `#autoBtn`, `#resetBtn`, `#speedSlider`, `#speedLabel`.
- Keyboard: `ArrowRight`/`Space` = step, `ArrowLeft` = back, `r` = reset, `p` = play/pause, `+`/`=` = faster, `-` = slower.
- Button state: disable stepBtn when at end, disable backBtn when at start.

- [ ] **Step 2: Commit**

```bash
git add shared/controls.js
git commit -m "feat: add shared event playback controls module"
```

---

### Task 3: Graph Renderer (`shared/graph-renderer.js`)

**Files:**
- Create: `shared/graph-renderer.js`

- [ ] **Step 1: Implement renderGraph**

Exposes global `AlgoVis.renderGraph(canvas, config)`.

`config` shape:
```js
{
  vertices: [{ id, label, x, y, state: 'default'|'active'|'finalized' }],
  edges: [{ u, v, w, state: 'default'|'spt'|'mst'|'relaxing'|'relaxFail'|'negative'|'considering'|'rejected' }],
  distLabels: { vertexId: 'string to show above vertex' },
  directed: false  // optional, default false
}
```

Implementation:
1. Get canvas context, compute device pixel ratio scaling.
2. `getScaledPos(v)` — compute bounding box of all vertex positions, scale+center to fit canvas with 60px padding.
3. Clear canvas.
4. Draw edges first (so vertices render on top):
   - For each edge, draw line between `getScaledPos(vertices[u])` and `getScaledPos(vertices[v])`.
   - Color/width by state: default=#2a2a4a/2, spt|mst=#4ade80/3, relaxing=#fbbf24/4, relaxFail=#f87171/3, negative=#f87171/2.5, considering=#60a5fa/3, rejected=#f87171/2.
   - Weight label: midpoint of edge, offset 14px perpendicular. Color: #888 (or #f87171 if negative weight).
   - If directed, draw arrowhead at target vertex.
5. Draw vertices:
   - For each vertex, draw circle at scaled position, radius=24.
   - Fill/stroke by state: default=#1a1a3a/#555, active=#0a1a3a/#60a5fa, finalized=#0a2a15/#4ade80.
   - If active: draw glow (larger translucent circle behind).
   - Label inside circle: split by `\n`, first line bold 12px, second line 9px.
   - Distance label above circle: `d=X` in monospace, colored by state.

- [ ] **Step 2: Commit**

```bash
git add shared/graph-renderer.js
git commit -m "feat: add shared graph canvas renderer"
```

---

### Task 4: Table Renderer (`shared/table-renderer.js`)

**Files:**
- Create: `shared/table-renderer.js`

- [ ] **Step 1: Implement renderTable**

Exposes global `AlgoVis.renderTable(container, config)`.

`config` shape:
```js
{
  rows: ['label'...],
  cols: ['label'...],
  cells: [[{ value: string|number, state: 'empty'|'computing'|'filled'|'dependency' }]],
  formula: 'string showing current recurrence',  // optional
  highlightRow: number,  // optional
  highlightCol: number   // optional
}
```

Implementation:
- Build HTML table inside `container` (innerHTML replacement for simplicity).
- Header row from `cols` with corner cell empty.
- Each row: row label, then cells.
- Cell classes by state: `.cell-empty`, `.cell-computing` (blue bg), `.cell-filled`, `.cell-dependency` (yellow bg).
- If formula provided, render in `.formula-bar` div above table.
- Newly filled cells get `flashUpdate` animation class.

- [ ] **Step 2: Commit**

```bash
git add shared/table-renderer.js
git commit -m "feat: add shared DP table renderer"
```

---

### Task 5: Tree Renderer (`shared/tree-renderer.js`)

**Files:**
- Create: `shared/tree-renderer.js`

- [ ] **Step 1: Implement renderTree**

Exposes global `AlgoVis.renderTree(canvas, config)`.

`config` shape:
```js
{
  nodes: [{ id, label, children: [id|null, id|null], state: 'default'|'active'|'merged'|'highlighted' }],
  edgeLabels: { 'parentId-childId': 'label' },  // optional
  rootId: id
}
```

Implementation:
1. Compute layout: BFS from root, assign x/y positions. Each level gets equal vertical spacing. Nodes at each level spread horizontally.
2. Draw edges (lines from parent to child centers), with optional labels at midpoints.
3. Draw nodes: rounded rectangles or circles, colored by state. Label inside.
   - default=#1a1a3a/#555, active=#0a1a3a/#60a5fa, merged=#1a2a1a/#4ade80, highlighted=#2a1a1a/#fbbf24.

- [ ] **Step 2: Commit**

```bash
git add shared/tree-renderer.js
git commit -m "feat: add shared tree canvas renderer"
```

---

### Task 6: Shared Graph Presets (`shared/graph-presets.js`)

**Files:**
- Create: `shared/graph-presets.js`

- [ ] **Step 1: Create graph presets used by Dijkstra, Bellman-Ford, Floyd-Warshall, MST**

Exposes global `AlgoVis.GRAPH_PRESETS`.

Three presets, all undirected. Each has `vertices`, `edges`, `source`, `name`, `description`.

UCR Map (0-indexed internally, displayed as 1-indexed):
```js
{
  name: 'UCR Campus (HW4/5)',
  vertices: [
    { id: 0, label: '1\nBourns', x: 150, y: 80 },
    { id: 1, label: '2\nBookstore', x: 350, y: 60 },
    { id: 2, label: '3\nPierce', x: 500, y: 180 },
    { id: 3, label: '4\nHUB', x: 400, y: 320 },
    { id: 4, label: '5\nBell Tower', x: 200, y: 250 },
    { id: 5, label: '6\nGreenhouse', x: 550, y: 420 },
    { id: 6, label: '7\nWinston', x: 100, y: 420 },
    { id: 7, label: '8\nLibrary', x: 350, y: 500 },
  ],
  edges: [
    {u:0,v:1,w:3},{u:0,v:4,w:9},{u:0,v:5,w:14},{u:0,v:6,w:1},
    {u:1,v:2,w:4},{u:1,v:4,w:5},{u:2,v:3,w:2},{u:3,v:4,w:6},
    {u:3,v:5,w:8},{u:3,v:7,w:7},{u:5,v:6,w:17},{u:5,v:7,w:15}
  ],
  source: 6,
  description: 'Source: Winston Chung Hall (vertex 7)'
}
```

Simple (5 vertices A-E):
```js
{
  name: 'Simple Graph',
  vertices: [
    { id: 0, label: 'A', x: 150, y: 150 },
    { id: 1, label: 'B', x: 400, y: 80 },
    { id: 2, label: 'C', x: 600, y: 200 },
    { id: 3, label: 'D', x: 350, y: 350 },
    { id: 4, label: 'E', x: 150, y: 380 },
  ],
  edges: [
    {u:0,v:1,w:4},{u:0,v:4,w:1},{u:1,v:2,w:2},
    {u:1,v:3,w:5},{u:2,v:3,w:1},{u:3,v:4,w:3},{u:0,v:3,w:7}
  ],
  source: 0,
  description: 'Source: A'
}
```

Dense (6 vertices S,A,B,C,D,T):
```js
{
  name: 'Dense Graph',
  vertices: [
    { id: 0, label: 'S', x: 100, y: 250 },
    { id: 1, label: 'A', x: 280, y: 100 },
    { id: 2, label: 'B', x: 280, y: 400 },
    { id: 3, label: 'C', x: 460, y: 100 },
    { id: 4, label: 'D', x: 460, y: 400 },
    { id: 5, label: 'T', x: 640, y: 250 },
  ],
  edges: [
    {u:0,v:1,w:7},{u:0,v:2,w:9},{u:0,v:5,w:14},
    {u:1,v:2,w:10},{u:1,v:3,w:15},{u:2,v:4,w:11},
    {u:2,v:3,w:2},{u:3,v:5,w:6},{u:4,v:5,w:9}
  ],
  source: 0,
  description: 'Source: S'
}
```

Also export a `buildAdj(vertices, edges)` helper that returns adjacency list (both directions for undirected):
```js
function buildAdj(n, edges) {
  const adj = Array.from({length: n}, () => []);
  edges.forEach(e => {
    adj[e.u].push({to: e.v, w: e.w});
    adj[e.v].push({to: e.u, w: e.w});
  });
  return adj;
}
```

Negative edge presets (one per graph):
```js
NEGATIVE_EDGES: {
  'UCR Campus (HW4/5)': {u:2, v:3, w:-5},
  'Simple Graph': {u:2, v:4, w:-6},
  'Dense Graph': {u:3, v:4, w:-8}
}
```

- [ ] **Step 2: Commit**

```bash
git add shared/graph-presets.js
git commit -m "feat: add shared graph presets (UCR map, simple, dense)"
```

---

### Task 7: Update Landing Page

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Update landing page links**

Update the existing `index.html` to link all 8 visualizer pages (not just Dijkstra). Keep current design. Change "coming soon" cards to active links: `dijkstra/`, `bellman-ford/`, `mst/`, `floyd-warshall/`, `dp/`, `huffman/`, `parallel/`. Add Floyd-Warshall card. Keep cards in priority order.

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: update landing page with all algorithm links"
```

---

## Chunk 2: Dijkstra's Algorithm

### Task 8: Dijkstra Pure Algorithm (`dijkstra/algo.js`)

**Files:**
- Create: `dijkstra/algo.js`

- [ ] **Step 1: Implement runDijkstra**

Exposes global `AlgoVis.runDijkstra(n, adj, source)` returning `Event[]`.

```js
function runDijkstra(n, adj, source) {
  const INF = Infinity;
  const dist = Array(n).fill(INF);
  const parent = Array(n).fill(-1);
  const finalized = Array(n).fill(false);
  dist[source] = 0;
  const events = [];

  events.push({ type: 'init', dist: [...dist], source });

  for (let round = 0; round < n; round++) {
    // extractMin: find non-finalized vertex with smallest dist
    let u = -1;
    for (let i = 0; i < n; i++) {
      if (!finalized[i] && (u === -1 || dist[i] < dist[u])) u = i;
    }
    if (u === -1 || dist[u] === INF) break; // remaining are unreachable

    finalized[u] = true;
    events.push({
      type: 'extract', vertex: u, dist: dist[u],
      pq: dist.map((d, i) => ({id: i, dist: d, inPQ: !finalized[i]}))
    });

    // relax all neighbors
    for (const {to: v, w} of adj[u]) {
      const newDist = dist[u] + w;
      const oldDist = dist[v];
      const success = newDist < oldDist;
      if (success) {
        dist[v] = newDist;
        parent[v] = u;
      }
      events.push({
        type: success ? 'relax' : 'relax-skip',
        from: u, to: v, weight: w,
        newDist, oldDist,
        currentDist: dist[v],
        success,
        finalized: finalized[v],
        negativeWarning: success && finalized[v]
      });
    }
  }

  const hasNegWarning = events.some(e => e.negativeWarning);
  events.push({
    type: 'done', dist: [...dist], parent: [...parent],
    negativeWarning: hasNegWarning
  });
  return events;
}
```

- [ ] **Step 2: Verify against UCR map expected results**

Expected shortest distances from Winston (vertex 6, 0-indexed) on UCR map:
- Vertex 0 (Bourns): 1
- Vertex 1 (Bookstore): 4
- Vertex 2 (Pierce): 8
- Vertex 3 (HUB): 10
- Vertex 4 (Bell Tower): 9
- Vertex 5 (Greenhouse): 15
- Vertex 6 (Winston): 0
- Vertex 7 (Library): 17

Open browser console, load algo.js and graph-presets.js, run:
```js
const p = AlgoVis.GRAPH_PRESETS[0];
const adj = AlgoVis.buildAdj(p.vertices.length, p.edges);
const events = AlgoVis.runDijkstra(p.vertices.length, adj, p.source);
const done = events.find(e => e.type === 'done');
console.log(done.dist);
// Expected: [1, 4, 8, 10, 9, 15, 0, 17]
```

- [ ] **Step 3: Commit**

```bash
git add dijkstra/algo.js
git commit -m "feat: implement Dijkstra pure algorithm with event generation"
```

---

### Task 9: Dijkstra HTML Shell (`dijkstra/index.html`)

**Files:**
- Create: `dijkstra/index.html`

- [ ] **Step 1: Create HTML shell**

Standard HTML page that:
1. Links `../shared/style.css`
2. Contains the layout: header (back btn + "Dijkstra's Algorithm" + Greedy tag), main grid with graph-area (controls + canvas + legend/stats) and sidebar (presets + negative toggle + step-info + PQ display + distance table + pseudocode).
3. Pseudocode text matches the spec exactly (lines 0-11 from spec).
4. Loads scripts in order: `../shared/graph-presets.js`, `../shared/graph-renderer.js`, `../shared/controls.js`, `algo.js`, `ui.js`.
5. All IDs match what controls.js and ui.js expect: `graphCanvas`, `stepBtn`, `backBtn`, `autoBtn`, `resetBtn`, `speedSlider`, `speedLabel`, `stepInfo`, `pqDisplay`, `distBody`, `relaxCount`, `successCount`, `negToggle`.

- [ ] **Step 2: Commit**

```bash
git add dijkstra/index.html
git commit -m "feat: add Dijkstra HTML shell with layout and pseudocode"
```

---

### Task 10: Dijkstra UI Wiring (`dijkstra/ui.js`)

**Files:**
- Create: `dijkstra/ui.js`

- [ ] **Step 1: Implement UI wiring**

On page load:
1. Read preset from URL param or default to UCR.
2. Build adj list from preset edges.
3. Run `AlgoVis.runDijkstra(n, adj, source)` to get events.
4. Create player: `AlgoVis.createPlayer(events, onEvent)`.
5. Draw initial graph state.

Preset buttons: on click, re-run algorithm with new preset, reset player.

Negative toggle: on change, add/remove negative edge from edges, rebuild adj, re-run, reset.

`onEvent(event, index, total)` function:
- Maintain running state by replaying events 0..index to compute: current dist[], parent[], finalized[], currentVertex, relaxingEdge.
- Call `AlgoVis.renderGraph(canvas, renderState)` with vertex/edge states derived from running state.
- Update sidebar:
  - **Step info:** Based on event type:
    - `init`: "Ready. Source: X. Click Step Forward to begin."
    - `extract`: "Extracting vertex X (dist=Y). Greedy choice: smallest tentative distance."
    - `relax`: "Relaxing (X->Y): d[X]+w = Z vs d[Y] = W. UPDATED/NO CHANGE." with math detail.
    - `relax-skip`: same but shows NO CHANGE.
    - `done`: "Complete! N relaxations, M successful." + negative warning if applicable.
  - **PQ display:** from extract event's pq snapshot.
  - **Distance table:** rebuild from current dist/parent/finalized.
  - **Pseudocode:** highlight active line based on event type.
  - **Relaxation counters:** count relax + relax-skip events up to current index.

- [ ] **Step 2: Open in browser and test UCR map walkthrough**

Open `dijkstra/index.html`. Step through all events. Verify:
- All 8 vertices get finalized (no disconnected nodes).
- Final distances match expected: [1, 4, 8, 10, 9, 15, 0, 17].
- Relaxation math is correct in sidebar.
- PQ shrinks correctly.
- SPT edges highlight green.

- [ ] **Step 3: Test negative edge toggle**

Enable negative edge. Step through. Verify the warning appears and explains why Dijkstra fails.

- [ ] **Step 4: Test other presets**

Switch to Simple and Dense presets. Step through. Verify no crashes, correct behavior.

- [ ] **Step 5: Commit**

```bash
git add dijkstra/ui.js
git commit -m "feat: implement Dijkstra UI with step explanations and graph rendering"
```

---

## Chunk 3: Bellman-Ford

### Task 11: Bellman-Ford Algorithm (`bellman-ford/algo.js`)

**Files:**
- Create: `bellman-ford/algo.js`

- [ ] **Step 1: Implement runBellmanFord**

Exposes `AlgoVis.runBellmanFord(n, edges, source)` returning `Event[]`.

Events: `init`, `round-start`, `relax`/`relax-fail`, `round-end`, `negative-cycle-check`, `done`.

For undirected graphs, each edge (u,v,w) must be treated as two directed edges (u->v) and (v->u). The function takes a directed edge list; the caller is responsible for doubling undirected edges.

Implementation follows the spec pseudocode exactly. Include round-by-round distance snapshots in round-end events for the history table.

- [ ] **Step 2: Verify against UCR map — same final distances as Dijkstra**

- [ ] **Step 3: Commit**

```bash
git add bellman-ford/algo.js
git commit -m "feat: implement Bellman-Ford algorithm with negative cycle detection"
```

---

### Task 12: Bellman-Ford HTML + UI (`bellman-ford/index.html`, `bellman-ford/ui.js`)

**Files:**
- Create: `bellman-ford/index.html`
- Create: `bellman-ford/ui.js`

- [ ] **Step 1: Create HTML shell**

Same layout as Dijkstra but: title = "Bellman-Ford", tag = "DP", pseudocode = Bellman-Ford from spec, round counter in sidebar, round-by-round distance history table.

- [ ] **Step 2: Implement UI wiring**

Same pattern as Dijkstra ui.js. Additional sidebar features:
- Round number prominently displayed.
- Distance history table showing dist[] at end of each round.
- Total relaxation count compared to Dijkstra's count for same graph.
- DP recurrence displayed in formula bar.

- [ ] **Step 3: Test all 3 presets, verify same final distances as Dijkstra**

- [ ] **Step 4: Commit**

```bash
git add bellman-ford/
git commit -m "feat: implement Bellman-Ford visualizer with round-by-round history"
```

---

## Chunk 4: MST (Kruskal + Prim)

### Task 13: Kruskal's Algorithm (`mst/algo-kruskal.js`)

**Files:**
- Create: `mst/algo-kruskal.js`

- [ ] **Step 1: Implement runKruskal with union-find**

Exposes `AlgoVis.runKruskal(n, edges)` returning `Event[]`.

Events: `init`, `sort`, `consider-edge`, `accept-edge`, `reject-edge`, `done`.

Includes union-find (with path compression + union by rank) internally. Each event includes current component membership and MST running total weight.

- [ ] **Step 2: Verify UCR map MST total weight = 23**

(Edges in MST: 1+2+3+4+5+6+7 = wait, need to compute. Sorted edges: 1,2,3,4,5,6,7,8,9,14,15,17. MST edges: (0,6,1), (2,3,2), (0,1,3), (1,2,4), (1,4,5), (3,4,6)... let me just verify via the algorithm output.)

- [ ] **Step 3: Commit**

```bash
git add mst/algo-kruskal.js
git commit -m "feat: implement Kruskal's algorithm with union-find"
```

---

### Task 14: Prim's Algorithm (`mst/algo-prim.js`)

**Files:**
- Create: `mst/algo-prim.js`

- [ ] **Step 1: Implement runPrim**

Exposes `AlgoVis.runPrim(n, adj, source)` returning `Event[]`.

Events: `init`, `extract`, `consider-edge`, `relax`, `relax-skip`, `done`.

CRITICAL: relaxation uses `w(u,v) < key[v]`, NOT `key[u] + w(u,v) < key[v]`.

- [ ] **Step 2: Verify same MST total weight as Kruskal's on all presets**

- [ ] **Step 3: Commit**

```bash
git add mst/algo-prim.js
git commit -m "feat: implement Prim's algorithm with edge-level events"
```

---

### Task 15: MST HTML + UI (`mst/index.html`, `mst/ui.js`)

**Files:**
- Create: `mst/index.html`
- Create: `mst/ui.js`

- [ ] **Step 1: Create HTML shell with Kruskal/Prim toggle**

Tab or toggle to switch between algorithms. Sidebar shows: sorted edge list (Kruskal) or PQ + key table (Prim), MST total weight, pseudocode for active algorithm.

For Kruskal: sorted edge list with accept/reject coloring, component membership.
For Prim: same layout as Dijkstra but with "key" labels, and explicit "w(u,v) < key[v]" callout.

- [ ] **Step 2: Implement UI wiring with algorithm switching**

- [ ] **Step 3: Test both algorithms on all 3 presets — same MST total weight**

- [ ] **Step 4: Commit**

```bash
git add mst/
git commit -m "feat: implement MST visualizer with Kruskal/Prim toggle"
```

---

## Chunk 5: Floyd-Warshall

### Task 16: Floyd-Warshall Algorithm (`floyd-warshall/algo.js`)

**Files:**
- Create: `floyd-warshall/algo.js`

- [ ] **Step 1: Implement runFloydWarshall**

Exposes `AlgoVis.runFloydWarshall(n, edges)` returning `Event[]`.

Events: `init`, `phase-start` (which k), `update` (i, j, k, oldVal, newVal, improved), `phase-end` (distance matrix snapshot), `done`.

CRITICAL: k loop is outermost. For undirected graphs, initialize both d[i][j] and d[j][i] for each edge.

- [ ] **Step 2: Verify UCR map — d[6][0] should be 1, d[6][7] should be 17 (matching Dijkstra)**

- [ ] **Step 3: Commit**

```bash
git add floyd-warshall/algo.js
git commit -m "feat: implement Floyd-Warshall all-pairs shortest paths"
```

---

### Task 17: Floyd-Warshall HTML + UI

**Files:**
- Create: `floyd-warshall/index.html`
- Create: `floyd-warshall/ui.js`

- [ ] **Step 1: Create HTML shell**

Main area shows n*n distance matrix (table-renderer). Sidebar shows: phase k, formula bar with d[i][j] = min(d[i][j], d[i][k]+d[k][j]), pseudocode.

- [ ] **Step 2: Implement UI wiring**

Use table-renderer to show the all-pairs distance matrix. Highlight current cell (i,j) being computed, and the two dependency cells (i,k) and (k,j). Show the intermediate vertex k prominently.

- [ ] **Step 3: Test on all presets**

- [ ] **Step 4: Commit**

```bash
git add floyd-warshall/
git commit -m "feat: implement Floyd-Warshall visualizer with distance matrix"
```

---

## Chunk 6: DP Algorithms

### Task 18: DP Algorithms (`dp/algo-knapsack.js`, `dp/algo-lcs.js`, `dp/algo-lis.js`, `dp/algo-edit-distance.js`)

**Files:**
- Create: `dp/algo-knapsack.js` (both 0/1 and unbounded)
- Create: `dp/algo-lcs.js`
- Create: `dp/algo-lis.js`
- Create: `dp/algo-edit-distance.js`
- Create: `dp/presets.js`

- [ ] **Step 1: Implement all 5 DP algorithms as pure event generators**

Each returns `Event[]` with types: `init`, `fill-cell` (row, col, value, deps[], formula), `done`.

Each `fill-cell` event includes:
- `row`, `col`: which cell
- `value`: computed value
- `deps`: array of {row, col} for dependency cells to highlight
- `formula`: string like "max(DP[1][3], DP[0][1] + 5) = 5"
- `decision`: human-readable explanation ("Take item 2: weight 3, value 5")

0/1 Knapsack: DP[i-1] reference (previous row).
Unbounded Knapsack: DP[i] reference (current row). 1D table.
LCS: 2D table with match/skip-x/skip-y decisions.
Edit Distance: 2D table with match/insert/delete/replace decisions.
LIS: 1D table with "best second-to-last element" decisions.

- [ ] **Step 2: Create presets**

```js
AlgoVis.DP_PRESETS = {
  knapsack01: { name: '0/1 Knapsack', items: [{w:2,v:3},{w:3,v:4},{w:4,v:5},{w:5,v:6}], W: 8 },
  knapsackUnbounded: { name: 'Unbounded Knapsack', items: [{w:2,v:3},{w:3,v:4},{w:4,v:5}], W: 8 },
  lcs: { name: 'LCS', X: 'ABCBDAB', Y: 'BDCABA' },
  editDistance: { name: 'Edit Distance', X: 'KITTEN', Y: 'SITTING' },
  lis: { name: 'LIS', A: [2, 3, 5, 4, 1, 5, 3, 4, 5, 1] }  // from final practice
};
```

- [ ] **Step 3: Verify LCS('ABCBDAB','BDCABA') = 4, LIS([2,3,5,4,1,5,3,4,5,1]) = 4, EditDist('KITTEN','SITTING') = 3**

- [ ] **Step 4: Commit**

```bash
git add dp/algo-*.js dp/presets.js
git commit -m "feat: implement all DP algorithms (knapsack, LCS, LIS, edit distance)"
```

---

### Task 19: DP HTML + UI (`dp/index.html`, `dp/ui.js`)

**Files:**
- Create: `dp/index.html`
- Create: `dp/ui.js`

- [ ] **Step 1: Create HTML with tabs**

Tabs: 0/1 Knapsack, Unbounded Knapsack, LCS, LIS, Edit Distance. Main area = table (table-renderer). Sidebar: step explanation with formula, pseudocode for active algorithm, decision explanation.

For LIS (1D): render as single row table.
For knapsack/LCS/edit-distance (2D): render as full 2D table.

- [ ] **Step 2: Implement UI wiring with tab switching**

On tab change: load corresponding preset, run algorithm, reset player.
onEvent: use table-renderer to show DP table with current cell highlighted and dependency arrows. Show formula bar with current recurrence and substituted values. Show 0/1 vs unbounded knapsack note when on knapsack tabs.

- [ ] **Step 3: Test all 5 algorithms with all presets**

- [ ] **Step 4: Commit**

```bash
git add dp/
git commit -m "feat: implement DP visualizer with tabbed knapsack/LCS/LIS/edit-distance"
```

---

## Chunk 7: Huffman Coding

### Task 20: Huffman Algorithm + UI

**Files:**
- Create: `huffman/algo.js`
- Create: `huffman/presets.js`
- Create: `huffman/index.html`
- Create: `huffman/ui.js`

- [ ] **Step 1: Implement runHuffman**

Exposes `AlgoVis.runHuffman(text)` returning `Event[]`.

Events: `init` (frequency table), `extract-two` (two min nodes), `merge` (new node created, tree snapshot), `done` (final tree, code table, total length).

Each event includes the full tree state and PQ contents for rendering.

- [ ] **Step 2: Create presets**

```js
{ name: '"forretress" (HW2)', text: 'forretress' },
{ name: '"abracadabra" (Final Practice)', text: 'abracadabra' }
```

- [ ] **Step 3: Create HTML shell**

Main area = tree (tree-renderer). Sidebar: PQ contents, frequency table, code table (built up as tree grows), total code length, pseudocode.

- [ ] **Step 4: Implement UI wiring**

onEvent: render tree at current build state, show PQ, show partial code table once tree is complete.

- [ ] **Step 5: Verify "abracadabra" total length = 23**

- [ ] **Step 6: Commit**

```bash
git add huffman/
git commit -m "feat: implement Huffman coding visualizer with tree building"
```

---

## Chunk 8: Parallel Algorithms

### Task 21: Parallel Algorithms + UI

**Files:**
- Create: `parallel/algo-reduce.js`
- Create: `parallel/algo-prefix-sum.js`
- Create: `parallel/algo-filter.js`
- Create: `parallel/algo-mergesort.js`
- Create: `parallel/presets.js`
- Create: `parallel/index.html`
- Create: `parallel/ui.js`

- [ ] **Step 1: Implement all parallel algorithm event generators**

Each builds a fork-join tree as events. Events include: `init`, `fork` (split into subproblems), `compute` (leaf computation), `join` (combine results), `done`.

For each, track work and span at each level.

Reduce: binary tree of additions.
Prefix Sum: pair-up, recurse, expand-back. Three phases per level.
Filter: flag -> prefix-sum -> scatter. Show flag array, prefix sum, and output.
Parallel Quicksort: pivot selection, two filters (< and >), recursive fork.
Parallel Merge Sort: split, recursive fork, parallel merge.

- [ ] **Step 2: Create presets**

```js
AlgoVis.PARALLEL_PRESETS = {
  basic: { name: 'Basic', A: [1,2,3,4,5,6,7,8] },
  filter: { name: 'Filter (odds)', A: [4,2,9,3,6,5,7,11,10,8], predicate: 'odd' },
};
```

- [ ] **Step 3: Create HTML with tabs**

Tabs: Reduce, Prefix Sum, Filter, Quicksort, Merge Sort. Main area = tree visualization (tree-renderer) showing fork-join structure. Sidebar: work/span display, current level, pseudocode, array state.

- [ ] **Step 4: Implement UI wiring with tab switching**

- [ ] **Step 5: Verify reduce([1..8]) = 36, prefix-sum([1..8]) = [1,3,6,10,15,21,28,36]**

- [ ] **Step 6: Commit**

```bash
git add parallel/
git commit -m "feat: implement parallel algorithms visualizer (reduce, prefix-sum, filter, quicksort, merge-sort)"
```

---

## Chunk 9: Final Polish + GitHub

### Task 22: Cross-browser test and final commit

- [ ] **Step 1: Open every visualizer page, step through at least one preset each**

Verify: no console errors, all graphs render, all tables fill, all trees build, all step explanations make sense.

- [ ] **Step 2: Create .gitignore**

```
.DS_Store
```

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete CS 141 algorithm visualizer with all algorithms"
```

---

### Task 23: Push to GitHub

- [ ] **Step 1: Create GitHub repo and push**

```bash
cd /Users/sreenidhi/Downloads/CS_141_Review/algo-visualizer
gh repo create algo-visualizer --public --source=. --push
```

- [ ] **Step 2: Enable GitHub Pages**

```bash
gh api repos/ninaphatak/algo-visualizer/pages -X POST -f source.branch=main -f source.path=/
```

- [ ] **Step 3: Verify site is live at https://ninaphatak.github.io/algo-visualizer/**
