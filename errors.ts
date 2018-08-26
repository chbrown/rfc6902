export class InvalidOperationError extends Error {
  constructor(public op: string) {
    super(`Invalid operation: ${op}`)
    this.name = 'InvalidOperationError'
  }
}
