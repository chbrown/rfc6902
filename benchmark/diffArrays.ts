/**
Benchmark for diffArrays.

This lives in an underscore-prefixed directory so that ava ignores it;
it's not part of the standard test suite. Compile and run with:

    npm run benchmark -- [options] [label=path/to/diff.js ...]

Each positional argument is a module exporting `diffArrays`
(defaults to this repo's compiled diff.js), which makes it easy to compare
the current implementation against an alternative (e.g., a compiled checkout
of another branch). Each (implementation, case, size) combination runs in its
own child process, so that timings and peak memory (maxRSS) are isolated, and
so that a pathological run can be killed by the timeout without taking down
the whole benchmark. Once a combination times out (or crashes), larger sizes
of that case are skipped for that implementation.

Options:
  --sizes 10,100,1000   array lengths to test
  --cases a,b           subset of case names (default: all)
  --budget 1000         target milliseconds of timed calls per combination
  --timeout 30000       milliseconds before a child process is killed
  --json                print raw JSON results instead of a table
*/
import {spawnSync} from 'child_process'
import {createHash} from 'crypto'
import {resolve} from 'path'

import {Pointer} from '../pointer'

type DiffArrays = (input: any[], output: any[], ptr: Pointer) => any[]

/** Deterministic PRNG (mulberry32), so every implementation sees the same data. */
function createRandom(seed: number): () => number {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function createItem(i: number) {
  return {id: i, name: `item ${i}`, tags: [i % 3, i % 5]}
}

function createItems(n: number, offset = 0) {
  return Array.from({length: n}, (_, i) => createItem(i + offset))
}

/** Apply ~10% random insert / remove / replace edits to a copy of `input`. */
function editRandomly(input: any[], fraction: number, seed: number): any[] {
  const random = createRandom(seed)
  const output = input.slice()
  const edits = Math.max(1, Math.round(input.length * fraction))
  for (let k = 0; k < edits; k++) {
    const index = Math.floor(random() * output.length)
    const choice = random()
    if (choice < 1 / 3) {
      output.splice(index, 0, createItem(-1 - k))
    }
    else if (choice < 2 / 3) {
      output.splice(index, 1)
    }
    else {
      output[index] = {...output[index], name: `edited ${k}`}
    }
  }
  return output
}

/** Each case maps an array length to an [input, output] pair. */
const cases: {[name: string]: (n: number) => [any[], any[]]} = {
  'identical': n => [createItems(n), createItems(n)],
  'replace-middle': n => {
    const output = createItems(n)
    output[n >> 1] = {...output[n >> 1], name: 'replaced'}
    return [createItems(n), output]
  },
  'insert-middle': n => {
    const output = createItems(n)
    output.splice(n >> 1, 0, createItem(-1))
    return [createItems(n), output]
  },
  'remove-middle': n => {
    const output = createItems(n)
    output.splice(n >> 1, 1)
    return [createItems(n), output]
  },
  'append': n => [createItems(n), createItems(n + 1)],
  'prepend': n => [createItems(n), [createItem(-1), ...createItems(n)]],
  'edit-10pct': n => [createItems(n), editRandomly(createItems(n), 0.1, n)],
  'disjoint': n => [createItems(n), createItems(n, n)],
  'primitives-edit-10pct': n => {
    const input = Array.from({length: n}, (_, i) => i)
    return [input, editRandomly(input, 0.1, n).map(x => typeof x === 'number' ? x : -1)]
  },
}

interface Result {
  impl: string
  case: string
  size: number
  status: 'ok' | 'timeout' | 'error'
  /** mean milliseconds per diffArrays call */
  ms?: number
  iterations?: number
  /** number of operations in the resulting patch */
  operations?: number
  /** short hash of the resulting patch, to check that implementations agree */
  hash?: string
  /** peak resident set size of the child process, in MB */
  maxRSS?: number
  error?: string
}

function runChild(implPath: string, caseName: string, size: number, budget: number) {
  const {diffArrays} = require(implPath) as {diffArrays: DiffArrays}
  const [input, output] = cases[caseName](size)
  const ptr = new Pointer()
  // warm up (and capture the result for comparison)
  const patch = diffArrays(input, output, ptr)
  let iterations = 0
  const start = process.hrtime.bigint()
  let elapsed = 0
  while (elapsed < budget || iterations === 0) {
    diffArrays(input, output, ptr)
    iterations++
    elapsed = Number(process.hrtime.bigint() - start) / 1e6
  }
  const result = {
    ms: elapsed / iterations,
    iterations,
    operations: patch.length,
    hash: createHash('sha1').update(JSON.stringify(patch)).digest('hex').slice(0, 8),
    maxRSS: process.resourceUsage().maxRSS / 1024,
  }
  process.stdout.write(JSON.stringify(result))
}

function parseArgs(argv: string[]) {
  const options = {
    sizes: [10, 100, 500, 1000, 2000],
    cases: Object.keys(cases),
    budget: 1000,
    timeout: 30000,
    json: false,
    impls: [] as {label: string, path: string}[],
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--sizes') options.sizes = argv[++i].split(',').map(Number)
    else if (arg === '--cases') options.cases = argv[++i].split(',')
    else if (arg === '--budget') options.budget = Number(argv[++i])
    else if (arg === '--timeout') options.timeout = Number(argv[++i])
    else if (arg === '--json') options.json = true
    else {
      const [label, path] = arg.includes('=') ? arg.split('=', 2) : [arg, arg]
      options.impls.push({label, path: resolve(path)})
    }
  }
  if (options.impls.length === 0) {
    options.impls.push({label: 'current', path: resolve(__dirname, '../diff')})
  }
  for (const caseName of options.cases) {
    if (!(caseName in cases)) {
      throw new Error(`Unknown case "${caseName}"; choose from: ${Object.keys(cases).join(', ')}`)
    }
  }
  return options
}

function formatTable(rows: string[][]): string {
  const widths = rows[0].map((_, c) => Math.max(...rows.map(row => row[c].length)))
  return rows.map(row => row.map((cell, c) => c < 2 ? cell.padEnd(widths[c]) : cell.padStart(widths[c])).join('  ')).join('\n')
}

function main() {
  const options = parseArgs(process.argv.slice(2))
  const results: Result[] = []
  for (const caseName of options.cases) {
    const failed = new Set<string>()
    for (const size of options.sizes) {
      for (const {label, path} of options.impls) {
        if (failed.has(label)) continue
        const child = spawnSync(process.execPath, [
          __filename, '--child', path, caseName, String(size), String(options.budget),
        ], {encoding: 'utf8', timeout: options.timeout})
        let result: Result
        if (child.error && (child.error as NodeJS.ErrnoException).code === 'ETIMEDOUT') {
          result = {impl: label, case: caseName, size, status: 'timeout'}
        }
        else if (child.status !== 0) {
          const stderr = child.stderr || String(child.signal)
          const error = /heap out of memory/.test(stderr) ? 'out of memory' :
            /Maximum call stack/.test(stderr) ? 'stack overflow' :
            stderr.trim().split('\n').slice(-1)[0]
          result = {impl: label, case: caseName, size, status: 'error', error}
        }
        else {
          result = {impl: label, case: caseName, size, status: 'ok', ...JSON.parse(child.stdout)}
        }
        if (result.status !== 'ok') failed.add(label)
        results.push(result)
        if (!options.json) {
          process.stderr.write(`${caseName} n=${size} ${label}: ${result.status === 'ok' ? `${result.ms!.toFixed(3)} ms` : result.status}\n`)
        }
      }
    }
  }
  if (options.json) {
    process.stdout.write(JSON.stringify(results, null, 2) + '\n')
    return
  }
  // flag any (case, size) where the implementations produced different patches
  const hashes = new Map<string, Set<string>>()
  for (const result of results.filter(r => r.status === 'ok')) {
    const key = `${result.case}/${result.size}`
    hashes.set(key, (hashes.get(key) || new Set()).add(result.hash!))
  }
  const rows = [['case', 'impl', 'n', 'ms/call', 'iters', 'ops', 'maxRSS MB', 'patch']]
  for (const r of results) {
    const differs = (hashes.get(`${r.case}/${r.size}`) || new Set()).size > 1
    rows.push(r.status === 'ok' ? [
      r.case, r.impl, String(r.size), r.ms!.toFixed(3), String(r.iterations), String(r.operations),
      r.maxRSS!.toFixed(0), r.hash! + (differs ? ' *' : ''),
    ] : [r.case, r.impl, String(r.size), r.status, '', '', '', r.error || ''])
  }
  process.stdout.write(formatTable(rows) + '\n')
  if ([...hashes.values()].some(set => set.size > 1)) {
    process.stdout.write('\n* implementations produced different (not necessarily worse) patches; compare ops\n')
  }
}

if (process.argv[2] === '--child') {
  const [implPath, caseName, size, budget] = process.argv.slice(3)
  runChild(implPath, caseName, Number(size), Number(budget))
}
else {
  main()
}
