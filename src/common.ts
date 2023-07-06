const StorageKeyPrefix = 'lauinfo_';
export enum StorageKeys {
  Url = StorageKeyPrefix + 'url',
  ApiToken = StorageKeyPrefix + 'token',
  UInfoChecked = StorageKeyPrefix + 'checked',
  AllPrivate = StorageKeyPrefix + 'all_private',
  NoPageAction = StorageKeyPrefix + 'page_action',
  NoPing = StorageKeyPrefix + 'no_ping',
}

/**
 * The main API path. Ends with a `/`.
 */
export const mainPath = `${localStorage[StorageKeys.Url]}/api/v1/`;

export const maxDescLen = 500;
export const yesIcon = {
    '18': '/img/icon-blue-18.png',
    '32': '/img/icon-blue-32.png',
    '36': '/img/icon-blue-36.png',
    '64': '/img/icon-blue-64.png'
  },
  noIcon = {
    '18': '/img/icon-gray-18.png',
    '32': '/img/icon-gray-32.png',
    '36': '/img/icon-gray-36.png',
    '64': '/img/icon-gray-64.png'
  },
  savingIcon = {
    '18': '/img/icon-gray-saving-18.png',
    '32': '/img/icon-gray-saving-32.png',
    '36': '/img/icon-gray-saving-36.png',
    '64': '/img/icon-gray-saving-64.png'
  };

export const REQ_TIME_OUT = 125 * 1000;
