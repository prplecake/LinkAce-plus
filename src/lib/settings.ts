import browser, {Storage} from 'webextension-polyfill';

import * as messageUtil from './messageUtil';
import {SettingsSignature, SettingsTypeMap} from './settingsSignature';

type Callback = () => void;

type SettingsValue = string | boolean | number;
type SettingsMap = { [s: string]: SettingsValue };

const defaultSettings: SettingsMap = {
  'setPrivate': false,
  'disableChecks': false,
};

class Settings {
  private storage: Storage.StorageArea;
  private map: SettingsMap = {};
  private readyCallbacks: Callback[] | null = [];

  public constructor() {
    this.storage = browser.storage.local;
    this.load();
    browser.storage.onChanged.addListener(this.load.bind(this));
  }

  public save() {
    this.storage.set(this.map);
  }

  public onReady(callback: Callback) {
    if (this.readyCallbacks) {
      this.readyCallbacks.push(callback);
    } else {
      callback();
    }
  }

  public restoreDefaults() {
    this.map = {};
    this.storage.clear();
  }

  public getAll() {
    const result: SettingsMap = {};
    for (const key in defaultSettings) {
      if (key in this.map) {
        result[key] = this.map[key];
      } else {
        result[key] = defaultSettings[key];
      }
    }
    return result as SettingsSignature;
  }

  public get<T extends keyof SettingsTypeMap>(key: T): SettingsTypeMap[T] {
    if (key in this.map) return this.map[key] as SettingsTypeMap[T];
    return defaultSettings[key] as SettingsTypeMap[T];
  }

  public set<T extends keyof SettingsTypeMap>(key: T, value: SettingsTypeMap[T]) {
    this.map[key] = value;
  }

  private load() {
    this.storage.get(null).then((map) => {
      this.map = map;
      if (this.readyCallbacks) {
        for (const callback of this.readyCallbacks) callback();
        this.readyCallbacks = null;
      }
      if (typeof messageUtil !== 'undefined') {
        const allSettings = this.getAll();
        messageUtil.sendToAllTabs('settingsChanged', allSettings);
        messageUtil.send('settingsChanged', allSettings);
        messageUtil.sendSelf('settingsChanged', allSettings);
      }
    });
  }
}

export const settings = new Settings();
