export class MissingError extends Error {
  constructor(public path: string) {
    super(`Value required at path: ${path}`)
    this.name = 'MissingError'
  }
}

export class InvalidOperationError extends Error {
  constructor(public op: string) {
    super(`Invalid operation: ${op}`)
    this.name = 'InvalidOperationError'
  }
}

export class TestError extends Error {
  constructor(public actual: any, public expected: any) {
    super(`Test failed: ${actual} != ${expected}`)
    this.name = 'TestError'
    this.actual = actual
    this.expected = expected
  }
}
