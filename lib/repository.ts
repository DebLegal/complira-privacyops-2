import { seed, workspaceSchema, type State } from "./domain";
export interface SyntheticRepository {
  load(): State;
  save(state: State): void;
  reset(): State;
}
const KEY = "complira.next.synthetic.v1";
export function sessionRepository(storage: Storage): SyntheticRepository {
  return {
    load() {
      const raw = storage.getItem(KEY);
      if (!raw) return seed();
      return workspaceSchema.parse(JSON.parse(raw));
    },
    save(s) {
      storage.setItem(KEY, JSON.stringify(workspaceSchema.parse(s)));
    },
    reset() {
      const s = seed();
      storage.setItem(KEY, JSON.stringify(s));
      return s;
    },
  };
}
