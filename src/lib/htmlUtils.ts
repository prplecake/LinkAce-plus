export function byId(id: string) {
  return document.getElementById(id);
}

export function on<T extends keyof HTMLElementEventMap>(
  node: Node, event: T, callback: (this: HTMLInputElement, ev: HTMLElementEventMap[T]) => any) {
  node.addEventListener(event, callback as EventListener);
}