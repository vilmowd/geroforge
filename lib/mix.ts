export function mixSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function shuffle<T>(items: T[], seed: string): T[] {
  const copy = [...items];
  let state = hashSeed(seed);
  for (let index = copy.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const swap = state % (index + 1);
    const current = copy[index];
    copy[index] = copy[swap];
    copy[swap] = current;
  }
  return copy;
}

export function interleave<T>(items: T[], seed: string, key: (item: T) => string): T[] {
  const groups = new Map<string, T[]>();
  for (const item of shuffle(items, seed)) {
    const name = key(item);
    const group = groups.get(name);
    if (group) group.push(item);
    else groups.set(name, [item]);
  }
  const names = shuffle([...groups.keys()], `${seed}:kinds`);
  const mixed: T[] = [];
  let remaining = items.length;
  while (remaining > 0) {
    let moved = false;
    for (const name of names) {
      const next = groups.get(name)?.shift();
      if (!next) continue;
      mixed.push(next);
      remaining -= 1;
      moved = true;
    }
    if (!moved) break;
  }
  return mixed;
}

export function spreadSources<T extends { sourceName: string }>(items: T[]): T[] {
  const next = [...items];
  for (let index = 1; index < next.length; index += 1) {
    if (next[index].sourceName !== next[index - 1].sourceName) continue;
    const swap = next.findIndex(
      (item, candidate) => candidate > index && item.sourceName !== next[index - 1].sourceName,
    );
    if (swap <= index) continue;
    const hold = next[index];
    next[index] = next[swap];
    next[swap] = hold;
  }
  return next;
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
