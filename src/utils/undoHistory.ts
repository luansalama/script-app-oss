type UndoEntry = {
  label: string;
  undo: () => void;
};

let stack: UndoEntry[] = [];
const MAX_HISTORY = 50;

export function pushUndo(entry: UndoEntry) {
  stack.push(entry);
  if (stack.length > MAX_HISTORY) stack.shift();
}

export function popUndo(): UndoEntry | undefined {
  return stack.pop();
}

export function clearUndo() {
  stack = [];
}
