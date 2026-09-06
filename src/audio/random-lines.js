// Cosmetic randomness is deliberately independent of the seeded attack simulation.
export class LineShuffle {
  constructor(random = Math.random) { this.random = random; this.bags = new Map(); this.last = new Map(); }
  pick(key, choices) {
    let bag = this.bags.get(key);
    if (!bag?.length) {
      bag = [...choices];
      for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(this.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
      if (bag.length > 1 && bag.at(-1) === this.last.get(key)) [bag[0], bag[bag.length - 1]] = [bag.at(-1), bag[0]];
      this.bags.set(key, bag);
    }
    const pick = bag.pop(); this.last.set(key, pick); return pick;
  }
}
