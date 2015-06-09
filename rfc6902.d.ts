declare module "rfc6902" {
  interface Operation {
    op: string;
    from?: string;
    path?: string;
    value?: string;
  }
  type Patch = Operation[];
  interface OperationResult extends Error { }
  function applyPatch(object: any, patch: Patch): OperationResult[];
  function createPatch(input: any, output: any): Patch;
}
