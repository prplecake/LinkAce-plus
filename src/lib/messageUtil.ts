import browser, { Runtime, Tabs } from 'webextension-polyfill';

export type Callback = (params: any, sender?: Runtime.MessageSender) => any;

type CallbacksMap = { [s: string]: Callback };

let callbacks: CallbacksMap | null = null;

function init() {
  const result: CallbacksMap = {};
  browser.runtime.onMessage.addListener((request: any, sender: any) => {
    if (result) {
      const callback = result[request.action];
      if (callback) {
        return callback(request.params, sender);
      }
    }
  });
  return result;
}

export function send(name: string, params?: any, callback?: (value: any) => any) {
  const data = {
    action: name,
    params,
  };
  const promise = browser.runtime.sendMessage(data);
  if (callback)  promise.then(callback);
}

export function sendSelf(name: string, params: any) {
  if (callbacks) {
    const callback = callbacks[name];
    if (callback) {
      return callback(params);
    }
  }
}

export function sendToAllTabs(name: string, params: any) {
  if (browser.tabs) {
    const data = {
      action: name,
      params,
    };
    browser.tabs.query({}).then((tabs: Tabs.Tab[]) => {
      for (const tab of tabs) {
        const { id } = tab;
        if (id) browser.tabs.sendMessage(id, data);
      }
    })
  }
}

export function sendToTab(tab: Tabs.Tab, name: string, params: any, callback?: (value: any) => any) {
  const data = {
    action: name,
    params,
  };
  if (tab.id) {
    const promise = browser.tabs.sendMessage(tab.id, data);
    if (callback) promise.then(callback);
  }
}

export function receive(name: string, callback: Callback) {
  callbacks = init();
  callbacks[name] = callback;
}
