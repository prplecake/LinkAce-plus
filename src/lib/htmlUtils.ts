export const byId = (id: string) => {
  return document.getElementById(id);
};

export const hide = (elem: HTMLElement | null) => {
  if (elem) elem.style.display = 'none';
};

export const show = (elem: HTMLElement | null) => {
  if (elem) elem.style.display = 'unset';
};

export const on = <T extends keyof HTMLElementEventMap>(
  node: Node,
  event: T,
  callback: (this: HTMLInputElement, ev: HTMLElementEventMap[T]) => any
) => {
  node.addEventListener(event, callback as EventListener);
};
