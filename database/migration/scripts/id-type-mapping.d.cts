// Types for id-type-mapping.cjs, which database/seed/clientSeeds.ts imports.
export interface IdTypeTarget {
  type: string;
  is_active: boolean;
}

export function loadIdTypeMapping(file?: string): {
  document: unknown;
  rules: Map<string, unknown>;
  targetTypes: IdTypeTarget[];
};
