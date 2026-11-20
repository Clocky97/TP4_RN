export class Pila<T> {
  #items: T[];

  constructor(iniciales: readonly T[] = []) {
    this.#items = [...iniciales];
  }

  get tamanio(): number {
    return this.#items.length;
  }

  get tope(): T | undefined {
    return this.#items[0];
  }

  apilar(item: T): void {
    this.#items.unshift(item);
  }

  desapilar(): T | undefined {
    return this.#items.splice(0, 1)[0];
  }

  aArray(): T[] {
    return [...this.#items];
  }
}
