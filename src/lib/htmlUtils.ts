import {Logger} from './logger';

const logger = new Logger('htmlUtils');

export const byId = (id: string) => {
  return document.getElementById(id);
};

export const hide = (elem: HTMLElement | null) => {
  logger.log('hiding element: ', elem);
  if (elem) elem.style.display = 'none';
};

export const show = (elem: HTMLElement | null) => {
  logger.log('showing element: ', elem);
  if (elem) elem.style.display = 'unset';
};

export const on = <T extends keyof HTMLElementEventMap>(
  node: Node, event: T,
  callback: (this: HTMLInputElement, ev: HTMLElementEventMap[T]) => any
) => {
  node.addEventListener(event, callback as EventListener);
};
