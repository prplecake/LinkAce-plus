// {url: {title, desc, tag, time, isSaved, isSaving}}
import $ from 'jquery';
import {
  mainPath,
  noIcon,
  REQ_TIME_OUT,
  savingIcon,
  StorageKeys,
  yesIcon
} from './common';
import Tab = browser.tabs.Tab;
import {PageInfo, PageStateInfo, UserInfo} from './models/Scope';
import {Link} from './models/LinkAce/Link';
import {validProto} from './lib/utils';

declare const window: any;

const pages: { [id: string]: any } = {};
let _userInfo: UserInfo;

const login = async (obj: { url: string, token: string }) => {
  console.log(obj);
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
        console.log(response);
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
      console.error(error);
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
  // console.log('getPageInfo');
  if (!url || (url.indexOf('https://') !== 0 && url.indexOf('http://') !== 0)) {
    return {url: url, isSaved: false};
  }
  console.log('url: ', url);
  console.log('pages: ', pages);

  const pageInfo = pages[url];
  console.log('pageInfo: ', pageInfo);
  if (pageInfo) {
    browser.runtime.sendMessage({
      type: 'render-page-info',
      data: pageInfo
    });
    return;
  }
  // download now
  const cb = function () {
    updateSelectedTabExtIcon();
  };
  queryPinState({
    url: url,
    ready: cb
  });
};
window.getPageInfo = getPageInfo;

const setPageInfo = (tab: Tab) => {
  // console.log('tab: ', tab);
  const pageInfo: PageInfo = {
    url: tab.url,
    title: tab.title,
  };
  pages[tab.url!] = pageInfo;
};
let isQuerying = false;
const queryPinState = (info: PageStateInfo) => {
  const userInfo = getUserInfo(),
    url = info.url,
    handler = function (data: any) {
      isQuerying = false;
      const posts = data.posts;
      let pageInfo: PageInfo = {isSaved: false};
      if (posts.length) {
        const post = posts[0];
        pageInfo = {
          url: post.href,
          title: post.description,
          desc: post.extended,
          tag: post.tags,
          time: post.time,
          shared: post.shared == 'no' ? false : true,
          toread: post.toread == 'yes' ? true : false,
          isSaved: true
        };
      }

      browser.runtime.sendMessage({
        type: 'render-page-info',
        data: pageInfo
      });
      pages[url as string] = pageInfo;
      info.ready && info.ready(pageInfo);
    };
  if ((info.isForce || !isQuerying) && userInfo && userInfo.isChecked &&
    info.url && url && validProto(url)) {
    isQuerying = true;
    const path = mainPath + 'search/links',
      options = {
        method: 'GET',
        headers: new Headers({
          Authorization: `Bearer ${userInfo.authToken}`,
          Accept: 'application/json'
        })
      };
    fetch(path, options)
      .then(handler)
      .catch((data) => {
        isQuerying = false;
        if (data.statusText == 'timeout') {
          delete pages[url];
        }
        browser.runtime.sendMessage({
          type: 'render-page-info'
        });
      });
  }
};

const updateSelectedTabExtIcon = () => {
  browser.tabs.query({
    active: true,
    currentWindow: true
  })
    .then((tabs) => {
      const tab = tabs[0];
      const pageInfo = pages[tab.url as string];
      let iconPath = noIcon;
      if (pageInfo && pageInfo.isSaved) {
        iconPath = yesIcon;
      } else if (pageInfo && pageInfo.isSaving) {
        iconPath = savingIcon;
      }
      browser.pageAction.setIcon(
        {
          path: iconPath,
          tabId: tab.id as number
        });
    });
};

const addPost = (info: any) => {
  console.log('info before post: ', info);
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
    console.log('path: ', path);
    info.shared && (data.is_private !== info.shared);
    console.log('link data before post: ', data);
    const options = {
      method: 'POST',
      headers: new Headers({
        Authorization: `Bearer ${userInfo.authToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }),
      body: JSON.stringify(data)
    };
    fetch(path, options)
      .then(response => {
        console.log(response);
        if (response.ok && !response.redirected) {
          pages[info.url].isSaved = true;
          pages[info.url].isSaving = false;
          console.log('pages info after saving: ', pages[info.url]);
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
    pages[info.url] = {isSaving: true};
    updateSelectedTabExtIcon();
    // add new tags (if any) to _tags
    if (info.tag) {
      const info_tags = info.tag.split(' ').filter(String);
      info_tags.forEach((tag: string) => {
        if (_tags.indexOf(tag) == -1) {
          _tags.push(tag);
        }
      });
    }
  }
};
window.addPost = addPost;

const deletePost = (url: string) => {
  const userInfo = getUserInfo();
  if (userInfo && userInfo.isChecked && url) {
    const path = mainPath + 'posts/delete';
    const settings: any = {
      url: path,
      type: 'GET',
      timeout: REQ_TIME_OUT,
      dataType: 'json',
      crossDomain: true,
      data: {
        url: url,
        format: 'json'
      },
      contentType: 'text/plain'
    };
    settings.data.auth_token = userInfo.authToken;
    const jqxhr = $.ajax(settings);
    jqxhr.always(function (data) {
      const resCode = data.result_code;
      if (resCode == 'done' || resCode == 'item not found') {
        delete pages[url];
        updateSelectedTabExtIcon();
        browser.runtime.sendMessage({
          type: 'deletepost-succeed'
        });
      } else {
        browser.runtime.sendMessage({
          type: 'deletepost-failed',
          error: 'Delete failed: ' + data.result_code
        });
      }
    });
    jqxhr.fail(function (data) {
      browser.runtime.sendMessage({
        type: 'deletepost-failed',
        error: 'Delete failed: ' + data.statusText
      });
    });
  }
};

const arraysEqual = function (_arr1: any[], _arr2: any[]) {
  if (!Array.isArray(_arr1) || !Array.isArray(
    _arr2) || _arr1.length !== _arr2.length) {
    return false;
  }

  const arr1 = _arr1.concat().sort();
  const arr2 = _arr2.concat().sort();

  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }

  return true;
};

const getSuggest = (url: string) => {
  const userInfo = getUserInfo();
  if (userInfo && userInfo.isChecked && url) {
    const path = mainPath + 'posts/suggest';
    const settings: any = {
      url: path,
      type: 'GET',
      data: {
        url: url,
        format: 'json'
      },
      // timeout: REQ_TIME_OUT,
      dataType: 'json',
      crossDomain: true,
      contentType: 'text/plain'
    };
    settings.data.auth_token = userInfo.authToken;
    const jqxhr = $.ajax(settings);
    jqxhr.always(function (data) {
      let popularTags: string[] = [], recommendedTags = [];
      if (data) {
        const default_recommended = [
          'ifttt', 'twitter', 'facebook', 'WSH', 'objective-c',
          'twitterlink', '1960s', '@codepo8', 'Aiviq', 'art'
        ];
        if (data[0] && arraysEqual(
            data[0].popular, ['objective-c']) && data[1]
          && arraysEqual(data[1].recommended, default_recommended)) {
          return;
        }
        if (data[0]) {
          popularTags = data[0].popular;
        }
        if (data[1]) {
          recommendedTags = data[1].recommended;
        }
      }
      // default to popluar tags, add new recommended tags
      const suggests = popularTags.slice();
      $.each(recommendedTags, function (index, tag) {
        if (popularTags.indexOf(tag) === -1) {
          suggests.push(tag);
        }
      });
      browser.runtime.sendMessage({
        type: 'render-suggests',
        data: suggests
      });
    });
  }
};

const _tags: string[] = [],
  _tagsWithCount = {};
// acquire all user tags from server refresh _tags
const _getTags = function () {
  const userInfo = getUserInfo();
  if (userInfo && userInfo.isChecked && userInfo.authToken) {
    const path = mainPath + 'tags',
      options = {
        method: 'GET',
        headers: new Headers({
          Authorization: `Bearer ${userInfo.authToken}`
        })
      };
    fetch(path, options)
      .then(response => response.json()
        .then(data => {
          if (data) {
            const sortTags = [];
            for (const t in data) {
              sortTags.push([t, data[t]]);
            }
            sortTags.sort(function (a, b) {
              return b[1] - a[1];
            });

            for (const i in sortTags) {
              _tags.push(sortTags[i][0]);
            }
          }
        }));
  }
};
_getTags();

const getTags = function () {
  return _tags;
};
const getTagsWithCount = function () {
  return _tagsWithCount;
};

// query at first time extension loaded
browser.tabs.query({
  active: true,
  currentWindow: true
})
  .then((tabs) => {
    const tab = tabs[0];
    if (localStorage[StorageKeys.NoPing] === 'true') {
      return;
    }
    console.log('query tab pin state on loaded');
    attemptPageAction(tab);
    setPageInfo(tab);
    queryPinState({
      url: tab.url,
      ready: (pageInfo: PageInfo) => {
        if (pageInfo && pageInfo.isSaved) {
          browser.pageAction.setIcon(
            {
              path: yesIcon,
              tabId: tab.id as number
            });
        } else {
          browser.pageAction.setIcon({
            path: noIcon,
            tabId: tab.id as number
          });
        }
      }
    });
  });

browser.tabs.onUpdated.addListener((id, changeInfo, tab) => {
  if (localStorage[StorageKeys.NoPing] === 'true') {
    return;
  }
  if (changeInfo.url) {
    const url = changeInfo.url;
    if (!pages.hasOwnProperty(url)) {
      console.log('query tab pin state on updated');
      attemptPageAction(tab);
      setPageInfo(tab);
      queryPinState({
        url: url,
        ready: function (pageInfo: PageInfo) {
          if (pageInfo && pageInfo.isSaved) {
            browser.pageAction.setIcon(
              { path: yesIcon, tabId: tab.id as number });
          } else {
            browser.pageAction.setIcon({path: noIcon, tabId: tab.id as number});
          }
        }
      });
    }
  }
  console.log('set tab pin state on opening');
  const url = String(changeInfo.url || tab.url);
  attemptPageAction(tab);
  if (pages[url] && pages[url].isSaved) {
    browser.pageAction.setIcon({ path: yesIcon, tabId: tab.id as number });
  }
});

browser.tabs.onActivated.addListener((activeInfo) => {
  if (localStorage[StorageKeys.NoPing] === 'true') {
    return;
  }
  browser.tabs.query({
    active: true,
    currentWindow: true
  })
    .then((tabs) => {
      const tab = tabs[0];
      const url = tab.url as string;
      if (!pages.hasOwnProperty(url)) {
        console.log('query tab pin state on activated');
        attemptPageAction(tab);
        setPageInfo(tab);
        queryPinState({
          url: url,
          ready: (pageInfo: PageInfo) => {
            if (pageInfo && pageInfo.isSaved) {
              browser.pageAction.setIcon(
                {
                  path: yesIcon,
                  tabId: tab.id as number
                });
            } else {
              browser.pageAction.setIcon({
                path: noIcon,
                tabId: tab.id as number
              });
            }
          }
        });
      }
    });
});

/*
Attempt to create a page action on this tab.
Do not show if options checkbox is checked or this is an invalid tab.
*/
const attemptPageAction = (tab: Tab) => {
  browser.pageAction.hide(tab.id!);
  if (localStorage[StorageKeys.NoPageAction] !== 'true' && validProto(tab.url)) {
    browser.pageAction.show(tab.id!);
  }
};
