const fs = require('fs');
const path = require('path');

const filesToUpdate = {
  // Foundation
  'ds-arrays.mdx': '2026-03-01',
  'ds-linked-lists.mdx': '2026-03-02',
  'ds-stacks-queues.mdx': '2026-03-03',
  'ds-hash-tables.mdx': '2026-03-04',
  
  // Intermediate
  'algo-searching.mdx': '2026-03-05',
  'algo-bubble-sort.mdx': '2026-03-06',
  'algo-selection-sort.mdx': '2026-03-07',
  'algo-insertion-sort.mdx': '2026-03-08',
  'algo-merge-sort.mdx': '2026-03-09',
  'algo-quick-sort.mdx': '2026-03-10',
  'algo-recursion.mdx': '2026-03-11',
  'ds-trees.mdx': '2026-03-12',
  'ds-trie.mdx': '2026-03-13',
  'ds-graphs.mdx': '2026-03-14',
  'algo-bfs-dfs.mdx': '2026-03-15',
  'algo-dijkstra-bellman.mdx': '2026-03-16',
  'algo-greedy.mdx': '2026-03-17',
  'algo-dynamic-programming.mdx': '2026-03-18',
  'algo-bitwise.mdx': '2026-03-19',
  'algo-mathematical.mdx': '2026-03-20',
  
  // Advanced
  'algo-dsu-mst.mdx': '2026-03-21',
  'algo-advanced-graph.mdx': '2026-03-22',
  'algo-advanced-dp.mdx': '2026-03-23',
  'ds-segment-tree.mdx': '2026-03-24',
  'ds-sparse-table.mdx': '2026-03-25',
  
  // Expert
  'algo-string.mdx': '2026-03-26',
  'algo-comp-geometry.mdx': '2026-03-27',
  'algo-network-flow.mdx': '2026-03-28',
  'algo-game-theory.mdx': '2026-03-29',
  'algo-approx-random.mdx': '2026-03-30',
  
  // Patterns
  'pattern-15-leetcode-strategies.mdx': '2026-03-31',
  'pattern-array-string.mdx': '2026-04-01',
  'pattern-linkedlist-intervals.mdx': '2026-04-02',
  'pattern-stack-heap.mdx': '2026-04-03',
  'pattern-tree-graph.mdx': '2026-04-04',
  'pattern-backtracking-dp.mdx': '2026-04-05'
};

const dir = path.join(__dirname, 'src', 'content', 'notes');

for (const [filename, dateStr] of Object.entries(filesToUpdate)) {
  const filePath = path.join(dir, filename);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/date: .*/, `date: ${dateStr}T00:00:00Z`);
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filename}`);
  } else {
    console.log(`Not found: ${filename}`);
  }
}
