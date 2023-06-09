import $ from 'jquery';
import {byId} from '../lib/htmlUtils';
import './options.scss';
import {StorageKeys} from "../common";

const input: { [s: string]: { storageKey: string, element: HTMLInputElement } } = {
  api_token: {
    storageKey: StorageKeys.ApiToken,
    element: byId('api_token') as HTMLInputElement
  },
  linkace_url: {
    storageKey: StorageKeys.Url,
    element: byId('linkace_url') as HTMLInputElement
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

for (const [key, value] of Object.entries(input)) {
  value.element.addEventListener("change", (e) => {
    console.log(e);
    console.log(key, value);
    if (value.element.type === 'checkbox') {
      localStorage[value.storageKey] = $(value.element).prop('checked');
    } else {
      localStorage[value.storageKey] = $(value.element).val();
    }
  })
}

window.addEventListener("load", (e) => {
  console.log(e);
  for (const [key, value] of Object.entries(input)) {
    if (value.element.type === 'checkbox') {
      $(value.element).prop('checked', localStorage[value.storageKey] === 'true')
    } else {
      $(value.element).val(localStorage[value.storageKey]);
    }
  }
});
