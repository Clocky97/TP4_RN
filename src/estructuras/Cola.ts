export class Cola<T> {
  #items: (T | undefined)[];
  #inicio: number;

  constructor(iniciales: readonly T[] = []) {
    this.#items = [...iniciales];
    this.#inicio = 0;
  }

  get tamanio(): number {
    return this.#items.length - this.#inicio;
  }

  get frente(): T | undefined {
    return this.#items[this.#inicio];
  }

  encolar(item: T): void {
    this.#items.push(item);
  }

  desencolar(): T | undefined {
    if (this.tamanio === 0) {
      return undefined;
    }
    const item = this.#items[this.#inicio];
    this.#items[this.#inicio] = undefined;
    this.#inicio += 1;
    if (this.#inicio > 16) {
      this.#items = this.#items.slice(this.#inicio);
      this.#inicio = 0;
    }
    return item;
  }

  aArray(): T[] {
    return this.#items
      .slice(this.#inicio)
      .filter((item): item is T => item !== undefined);
  }
}
