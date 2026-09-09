export class ModuleError extends Error {
  readonly code: string
  readonly args: Array<string | number>
  constructor(code: string, args: Array<string | number> = []) {
    super(code)
    this.name = 'ModuleError'
    this.code = code
    this.args = args
  }
}
