#!/usr/bin/env node
/** Type-check and exercise the shipped pure helpers. Compiler is supplied separately.
 * Usage: node checks/validate-table-contract.mjs /absolute/path/to/typescript/bin/tsc
 * Exact compiler reference: TypeScript 5.9.3, pinned in upstream package-lock.json.
 * No npm install, network, renderer, TableViewAdapter implementation or server is run.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const compiler = process.argv[2];
if (!compiler || !path.isAbsolute(compiler) || !fs.existsSync(compiler)) {
  throw new Error('Supply an absolute path to a separately obtained TypeScript 5.9.3 bin/tsc.');
}
const require = createRequire(import.meta.url);
// Load the standard compiler package API; no child process or package lifecycle scripts.
const ts = require(path.resolve(path.dirname(compiler), '../lib/typescript.js'));
assert.equal(ts.version, '5.9.3');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'word-mahjong-contract-check-'));
let checks = 0;
try {
  const program = ts.createProgram({
    rootNames: ['contracts/types.ts', 'contracts/table-view.ts'].map(p => path.join(root, p)),
    options: { strict: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10, noEmitOnError: true, outDir: temp },
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length) {
    throw new Error(ts.formatDiagnostics(diagnostics, { getCurrentDirectory: () => root,
      getCanonicalFileName: file => file, getNewLine: () => '\n' }));
  }
  const emitted = program.emit();
  assert.equal(emitted.emitSkipped, false, 'strict compiler must emit both checked contracts');
  assert.equal(emitted.diagnostics.length, 0);
  const contract = require(path.join(temp, 'table-view.js'));
  const data = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/table-view-cases.json'), 'utf8'));

  for (const c of data.seatCases) {
    const relative = Array.from({ length: c.count }, (_, seat) => contract.relativeSeat(seat, c.mySeat, c.count));
    assert.deepEqual(relative, c.expectedRelativeByLogicalSeat); checks++;
    assert.deepEqual(relative.map(r => contract.relationFor(r, c.count)), c.expectedRelationsByLogicalSeat); checks++;
  }
  const tiles = new Map(data.visibleTiles.map(t => [t.tileId, t]));
  for (const c of data.draftCases) {
    assert.deepEqual(contract.reconcileOwnDraft(c.handTileIds.map(id => tiles.get(id)), {
      orderedTileIds: c.orderedTileIds, commaAfterTileIds: c.commaAfterTileIds,
    }), { orderedTileIds: c.expectedOrderedTileIds, commaAfterTileIds: c.expectedCommaAfterTileIds });
    checks++;
  }
  for (const c of data.mobileLayoutCases) {
    const metrics = contract.MOBILE_RACK_METRICS.find(m => m.viewport === c.viewportWidth);
    for (const key of ['tileWidth', 'tileHeight', 'gap', 'padding', 'columns']) {
      assert.equal(metrics[key], c[key]); checks++;
    }
    c.cells.forEach((cell, index) => {
      assert.deepEqual(contract.mobileCell(index), { row: cell.row, column: cell.column }); checks++;
    });
  }
  for (const c of data.animationCases) {
    assert.equal(contract.sameViewStamp(c.captured, c.current), c.expectedMayCompleteCosmeticCleanup); checks++;
  }
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
console.log(`PASS_TABLE_CONTRACT_HELPERS: TypeScript 5.9.3 strict compilation of both contracts; ${checks} assertions against compiled exports.`);
console.log('Scope: pure helpers only; no TableViewAdapter implementation, rendering, browser or multiplayer verification.');
