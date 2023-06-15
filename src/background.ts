// {url: {title, desc, tag, time, isSaved, isSaving}}
import {mainPath, StorageKeys} from './common';
import {UserInfo} from './models/Scope';
import {Link} from './models/LinkAce/Link';
import {validProto} from './lib/utils';
import {Logger} from './lib/logger';
import Tab = browser.tabs.Tab;

declare let window: any;

const logger = new Logger('background');

const pages: { [id: string]: any } = {};
let _userInfo: UserInfo;

const login = async (obj: { url: string, token: string }) => {
  logger.log(obj);
  // test auth
  const path = obj.url + '/links';
  const options = {
    method: 'GET',
    headers: new Headers({
      Authorization: `Bearer ${obj.token}`
    })
  };
  fetch(path, options)
    .then(response => {
      if (response.ok) {
        logger.log(response);
        _userInfo.isChecked = true;
        localStorage[StorageKeys.Url] = obj.url;
        localStorage[StorageKeys.ApiToken] = obj.token;
        localStorage[StorageKeys.UInfoChecked] = true;

        browser.runtime.sendMessage({
          type: 'login-succeed'
        });
      } else {
        // login error
        browser.runtime.sendMessage({
          type: 'login-failed'
        });
      }
    })
    .catch(error => {
      logger.error(error);
      browser.runtime.sendMessage({
        type: 'login-failed'
      });
    });
};
window.login = login;

const logout = () => {
  _userInfo.isChecked = false;
  localStorage.removeItem(StorageKeys.UInfoChecked);
  localStorage.removeItem(StorageKeys.ApiToken);
  localStorage.removeItem(StorageKeys.Url);
  browser.runtime.sendMessage({
    type: 'logged-out'
  });
};
window.logout = logout;

const getUserInfo = () => {
  if (!_userInfo) {
    if (localStorage[StorageKeys.UInfoChecked]) {
      _userInfo = {
        apiUrl: localStorage[StorageKeys.Url],
        authToken: localStorage[StorageKeys.ApiToken],
        isChecked: localStorage[StorageKeys.UInfoChecked],
      };
    } else {
      _userInfo = {
        apiUrl: '',
        authToken: '',
        isChecked: false,
      };
    }
  }
  return _userInfo;
};
window.getUserInfo = getUserInfo;

// for popup.html to acquire page info
// if there is no page info at local then get it from server
const getPageInfo = (url: string) => {
  // logger.log('getPageInfo');
  if (!url || (url.indexOf('https://') !== 0 && url.indexOf('http://') !== 0)) {
    return {url: url, isSaved: false};
  }
  logger.log('url: ', url);
  logger.log('pages: ', pages);

  const pageInfo = pages[url];
  logger.log('pageInfo: ', pageInfo);
  if (pageInfo) {
    browser.runtime.sendMessage({
      type: 'render-page-info',
      data: pageInfo
    });
    return;
  }
};
window.getPageInfo = getPageInfo;

const setPageInfo = (tab: Tab) => {
  // logger.log('tab: ', tab);
  if (tab.url) {
    pages[tab.url] = {
      url: tab.url,
      title: tab.title,
    };
  }
};

const addPost = (info: any) => {
  logger.log('info before post: ', info);
  const userInfo = getUserInfo();
  if (userInfo && userInfo.isChecked && info.url && info.title) {
    const path = mainPath + 'links',
      data: Link = {
        url: info.url,
        title: info.title,
        description: info.description,
        tags: info.tags,
        lists: info.lists,
      };
    logger.log('path: ', path);
    info.shared && (data.is_private !== info.shared);
    logger.log('link data before post: ', data);
    const options = {
      method: 'POST',
      headers: new Headers({
        Authorization: `Bearer ${localStorage[StorageKeys.ApiToken]}`,
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(data)
    };
    fetch(path, options)
      .then(response => {
        logger.log(response);
        if (response.ok) {
          pages[info.url].isSaved = true;
          pages[info.url].isSaving = false;
          logger.log('pages info after saving: ', pages[info.url]);
          browser.runtime.sendMessage({
            type: 'addpost-succeed'
          });
        } else {
          // error
          pages[info.url].isSaved = false;
          pages[info.url].isSaving = false;
          browser.runtime.sendMessage({
            type: 'addpost-failed',
            error: 'Add failed: ' + response
          });
        }
      })
      .catch(error => {
        pages[info.url].isSaved = false;
        pages[info.url].isSaving = false;
        browser.runtime.sendMessage({
          type: 'addpost-failed',
          error: 'Add failed: ' + error
        });
      });
    // change icon state
    pages[info.url].isSaving = true;
  }
};
window.addPost = addPost;

// query at first time extension loaded
browser.tabs.query({active: true, currentWindow: true})
  .then((tabs) => {
    const tab = tabs[0];
    logger.log('query tab pin state on loaded');
    attemptPageAction(tab);
    setPageInfo(tab);
  });

browser.tabs.onUpdated.addListener((id, changeInfo, tab) => {
  if (changeInfo.url) {
    const url = changeInfo.url;
    if (!pages.hasOwn(url)) {
      logger.log('query tab pin state on updated');
      attemptPageAction(tab);
      setPageInfo(tab);
    }
  }
  logger.log('set tab pin state on opening');
  attemptPageAction(tab);
});

browser.tabs.onActivated.addListener((activeInfo) => {
  browser.tabs.query({active: true, currentWindow: true})
    .then((tabs) => {
      const tab = tabs[0];
      const url = tab.url as string;
      if (!pages.hasOwn(url)) {
        logger.log('query tab pin state on activated');
        attemptPageAction(tab);
        setPageInfo(tab);
      }
    });
});

/*
Attempt to create a page action on this tab.
Do not show if options checkbox is checked or this is an invalid tab.
*/
const attemptPageAction = (tab: Tab) => {
  if (tab.id) browser.pageAction.hide(tab.id);
  if (localStorage[StorageKeys.NoPageAction] !== 'true' && validProto(
    tab.url) && tab.id) {
    browser.pageAction.show(tab.id);
  }
};
