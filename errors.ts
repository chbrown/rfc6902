export class MissingError extends Error {
  constructor(public path: string) {
    super(`Value required at path: ${path}`);
    this.name = this.constructor.name;
  }
}

export class InvalidOperationError extends Error {
  constructor(public op: string) {
    super(`Invalid operation: ${op}`);
    this.name = this.constructor.name;
  }
}

export class TestError extends Error {
  constructor(public actual: any, public expected: any) {
    super(`Test failed: ${actual} != ${expected}`);
    this.name = this.constructor.name;
    this.actual = actual;
    this.expected = expected;
  }
}
