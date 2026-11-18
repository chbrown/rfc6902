/**
This module is prefixed with an underscore so that ava recognizes it as a helper,
instead of failing the entire test suite with a "No tests found" error.
*/

/** Used to turn a list of patch results into a list of strings / nulls.  */
export function resultName(result: {name: string} | null): string | null {
  return result && result.name
}
