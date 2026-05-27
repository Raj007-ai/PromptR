declare module "bun:test" {
  export function describe(name: string, fn: () => void): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function beforeEach(fn: () => void): void;
  export function expect(value: any): any;
  export function mock(fn?: any): any;
  export namespace mock {
    export function module(name: string, factory: () => any): void;
  }
}
