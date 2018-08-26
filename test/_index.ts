/**
This module is prefixed with an underscore so that ava recognizes it as a helper,
instead of failing the entire test suite with a "No tests found" error.
*/

/**
Brute-force clone object by passing it through a JSON stringify+parse roundtrip.
*/
export function clone<T>(object: T): T {
  return JSON.parse(JSON.stringify(object))
}
