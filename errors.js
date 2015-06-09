/*jslint esnext: true */
export class MissingError extends Error {
  constructor(path) {
    super(`Value required at path: ${path}`);
    this.name = this.constructor.name;
    this.path = path;
  }
}

export class InvalidOperationError extends Error {
  constructor(op) {
    super(`Invalid operation: ${op}`);
    this.name = this.constructor.name;
    this.op = op;
  }
}

export class TestError extends Error {
  constructor(actual, expected) {
    super(`Test failed: ${actual} != ${expected}`);
    this.name = this.constructor.name;
    this.actual = actual;
    this.expected = expected;
  }
}
