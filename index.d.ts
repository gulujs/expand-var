export interface ExpandVarOptions {
  skips?: string[];
  get?: (path: string) => any;
  /**
   * @default false
   */
  replaceUndefinedWithEmptyString?: boolean;
  /**
   * @default 'escapeDotStyle'
   */
  objectPathStyle?: 'escapeDotStyle' | 'quoteStyle';
}

export function expandVar(value: any, options?: ExpandVarOptions): void;
