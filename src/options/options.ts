import {StorageKeys} from '../common';
import $ from 'jquery';
import './options.scss';
import {Logger} from '../lib/logger';
import {byId} from '../functions/html';

const logger = new Logger('options');

const inputs: { [key: string]: { storageKey: string, element: HTMLElement | null } } = {
  api_token: {
    storageKey: StorageKeys.AuthToken,
    element: byId('api_token')
  },
  linkace_url: {
    storageKey: StorageKeys.Url,
    element: byId('linkace_url')
  },
  no_ping: {
    storageKey: StorageKeys.NoPing,
    element: byId('no_ping') as HTMLInputElement
  },
  all_private: {
    storageKey: StorageKeys.AllPrivate,
    element: byId('all_private') as HTMLInputElement
  },
  no_page_action: {
    storageKey: StorageKeys.NoPageAction,
    element: byId('no_page_action') as HTMLInputElement
  },
};

for (const [key, value] of Object.entries(inputs)) {
  const storageKey = value.storageKey;
  const element = value.element as HTMLInputElement;
  element.addEventListener('change', (e) => {
    logger.log(e);
    logger.log(key, value);
    if (element.type === 'checkbox') {
      localStorage[storageKey] = $(element).prop('checked');
    } else {
      localStorage[storageKey] = $(element).val();
    }
  });
}

window.addEventListener('load', (e) => {
  logger.log(e);
  for (const [key, value] of Object.entries(inputs)) {
    const storageKey = value.storageKey;
    const element = value.element as HTMLInputElement;
    if (element.type === 'checkbox') {
      $(element).prop('checked', localStorage[storageKey] === 'true');
    } else {
      $(element).val(localStorage[storageKey]);
    }
  }
});
