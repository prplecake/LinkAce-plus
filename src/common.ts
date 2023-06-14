const StorageKeyPrefix = 'lauinfo_';

export enum StorageKeys {
  Url = StorageKeyPrefix + 'url',
  ApiToken = StorageKeyPrefix + 'token',
  UInfoChecked = StorageKeyPrefix + 'checked',
  AllPrivate = StorageKeyPrefix + 'all_private',
  NoPageAction = StorageKeyPrefix + 'page_action',
}

/**
 * The main API path. Ends with a `/`.
 */
export const mainPath = `${localStorage[StorageKeys.Url]}/api/v1/`;

export const maxDescLen = 500;
