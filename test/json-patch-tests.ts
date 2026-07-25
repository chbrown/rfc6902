import test from 'ava'

import {applyPatch} from '../index'
import {Operation} from '../diff'
import {clone} from '../util'

import * as tests from 'json-patch-test-suite/tests.json'
import * as spec_tests from 'json-patch-test-suite/spec_tests.json'

/**
See https://github.com/json-patch/json-patch-tests#test-format
*/
interface TestCase {
  comment?: string
  doc: any
  patch: Operation[]
  expected?: any
  error?: string
  disabled?: boolean
}

const skipComments = new Set([
  // Replacing the root document's type (e.g., object -> array) is infeasible for this library,
  // since applyPatch mutates the given object in place rather than returning a new one;
  // a mutated object can't change its own type.
  'replace object document with array document?',
  'replace array document with object document?',
  'replace whole document',
  'replacing the root of the document is possible with add',
  // v5 (and previous) behavior is to throw an exception on invalid JSON pointer paths.
  // This should maybe be changed, but that would merit a major version bump.
  'invalid JSON Pointer token',
])

function run(suiteName: string, cases: TestCase[]) {
  cases.forEach((testCase, index) => {
    if (testCase.disabled || skipComments.has(testCase.comment ?? '')) {
      return
    }
    const title = `${suiteName}[${index}]: ${testCase.comment || JSON.stringify(testCase.patch)}`
    test(title, t => {
      const actual = clone(testCase.doc)
      const results = applyPatch(actual, testCase.patch)
      if (testCase.error !== undefined) {
        t.true(results.some(result => result !== null), `should produce an error: ${testCase.error}`)
      }
      else {
        t.deepEqual(actual, testCase.expected, 'should equal expected output after applying patches')
      }
    })
  })
}

run('tests', tests as unknown as TestCase[])
run('spec_tests', spec_tests as unknown as TestCase[])
