export interface ExpandVarOptions {
  skips?: string[];
  get?: (path: string) => any;
  /**
   * @default false
   */
  replaceUndefinedWithEmptyString?: boolean;
}

export function expandVar(value: any, options?: ExpandVarOptions): void;
