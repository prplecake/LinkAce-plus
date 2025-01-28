// {url: {title, desc, tag, time, isSaved, isSaving}}
import {
  mainPath,
  maxDescLen,
  noIcon,
  REQ_TIME_OUT,
  savingIcon,
  StorageKeys,
  yesIcon
} from "./common";
import $ from "jquery";
import Tab = browser.tabs.Tab;
import {getDefaultHeaders} from "./functions/headers";
import {Logger} from "./lib/logger";
import {getSearchPath} from "./functions/path";

declare let window: any;

const logger = new Logger("background");

const pages: { [key: string]: any } = {};
let _userInfo: any;

const login = (obj: { url: string, token: string} ) => {
  // test auth
  const path = `${obj.url}/links`,
    options = {
      method: "GET",
      headers: getDefaultHeaders(obj.token)
    };
  fetch(path, options)
    .then(response => {
      if (response.ok) {
        logger.log(response);
        // success
        _userInfo.isChecked = true;
        localStorage[StorageKeys.Url] = obj.url;
        localStorage[StorageKeys.AuthToken] = obj.token;
        localStorage[StorageKeys.Checked] = true;

        browser.runtime.sendMessage({
          type: "login-succeed"
        });
        _getTags();
      } else {
        // login error
        browser.runtime.sendMessage({
          type: "login-failed"
        });
      }
    })
    .catch((data) => {
      if (data.statusText == "timeout") {
        browser.runtime.sendMessage({
          type: "login-failed"
        });
      }
    });
};
window.login = login;

const logout = function () {
  _userInfo.isChecked = false;
  localStorage.removeItem(StorageKeys.Checked);
  localStorage.removeItem(StorageKeys.Name);
  localStorage.removeItem(StorageKeys.AuthToken);
  localStorage.removeItem(StorageKeys.NoPing);
  browser.runtime.sendMessage({
    type: "logged-out"
  });
};
window.logout = logout;

const getUserInfo = function () {
  if (!_userInfo) {
    if (localStorage[StorageKeys.Checked]) {
      _userInfo = {
        isChecked: localStorage[StorageKeys.Checked],
        authToken: localStorage[StorageKeys.AuthToken],
        name: localStorage[StorageKeys.Name],
      };
    } else {
      _userInfo = {
        isChecked: false,
        authToken: "",
        name: ""
      };
    }
  }
  return _userInfo;
};
window.getUserInfo = getUserInfo;

// for popup.html to acquire page info
// if there is no page info at local then get it from server
const getPageInfo = function (url: string) {
  if (!url || (url.indexOf("https://") !== 0 && url.indexOf(
    "http://") !== 0)) {
    return {
      url: url,
      isSaved: false
    };
  }
  const pageInfo = pages[url];
  if (pageInfo) {
    browser.runtime.sendMessage({
      type: "render-page-info",
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

let isQuerying = false;
const queryPinState = (info: any) => {
  const userInfo = getUserInfo(),
    url = info.url,
    handler = function (data: any) {
      isQuerying = false;
      const posts = data.posts;
      let pageInfo: any = {isSaved: false};
      if (posts.length) {
        const post = posts[0];
        pageInfo = {
          url: post.href,
          title: post.description,
          desc: post.extended,
          tag: post.tags,
          time: post.time,
          shared: post.shared == "no" ? false : true,
          toread: post.toread == "yes" ? true : false,
          isSaved: true
        };
      }

      browser.runtime.sendMessage({
        type: "render-page-info",
        data: pageInfo
      });
      pages[url] = pageInfo;
      info.ready && info.ready(pageInfo);
    };
  if ((info.isForce || !isQuerying) && userInfo && userInfo.isChecked &&
    info.url && (url.indexOf("https://") === 0 || url.indexOf("http://") === 0)) {
    isQuerying = true;
    const settings: any = {
      url: getSearchPath(url),
      type: "GET",
      data: {
        url: url,
        format: "json"
      },
      // timeout: REQ_TIME_OUT,
      dataType: "json",
      crossDomain: true,
      contentType: "text/plain"
    };
    settings.data.auth_token = userInfo.authToken;
    const jqxhr = $.ajax(settings);
    jqxhr.always(handler);
    jqxhr.fail(function (data) {
      isQuerying = false;
      if (data.statusText == "timeout") {
        delete pages[url];
      }
      browser.runtime.sendMessage({
        type: "render-page-info"
      });
    });
  }
};

const updateSelectedTabExtIcon = () => {
  browser.tabs.query({ active: true, currentWindow: true })
    .then(tabs => {
      const tab = tabs[0];
      const pageInfo = pages[tab.url as string];
      let iconPath = noIcon;
      if (pageInfo && pageInfo.isSaved) {
        iconPath = yesIcon;
      } else if (pageInfo && pageInfo.isSaving) {
        iconPath = savingIcon;
      }
      browser.browserAction.setIcon(
        { path: iconPath, tabId: tab.id });
      browser.pageAction.setIcon(
        { path: iconPath, tabId: tab.id as number });
    });
};

const addPost = function (info: any) {
  const userInfo = getUserInfo();
  if (userInfo && userInfo.isChecked && info.url && info.title) {
    let desc = info.desc;
    if (desc.length > maxDescLen) {
      desc = desc.slice(0, maxDescLen) + "...";
    }
    const path = mainPath + "posts/add",
      data: any = {
        description: info.title,
        url: info.url,
        extended: desc,
        tags: info.tag,
        format: "json"
      };
    info.shared && (data["shared"] = info.shared);
    info.toread && (data["toread"] = info.toread);
    const settings = {
      url: path,
      type: "GET",
      timeout: REQ_TIME_OUT,
      dataType: "json",
      crossDomain: true,
      data: data,
      contentType: "text/plain"
    };
    settings.data.auth_token = userInfo.authToken;
    const jqxhr = $.ajax(settings);
    jqxhr.always(function (data) {
      const resCode = data.result_code;
      if (resCode == "done") {
        // done
        pages[info.url] = {isSaved: true};
        updateSelectedTabExtIcon();
        queryPinState({
          url: info.url,
          isForce: true
        });
        browser.runtime.sendMessage({
          type: "addpost-succeed"
        });
      } else {
        // error
        pages[info.url] = {isSaved: false};
        updateSelectedTabExtIcon();
        browser.runtime.sendMessage({
          type: "addpost-failed",
          error: "Add failed: " + data.result_code
        });
      }
    });
    jqxhr.fail(function (data) {
      pages[info.url] = {isSaved: false};
      updateSelectedTabExtIcon();
      browser.runtime.sendMessage({
        type: "addpost-failed",
        error: "Add failed: " + data.statusText
      });
    });
    // change icon state
    pages[info.url] = {isSaving: true};
    updateSelectedTabExtIcon();
    // add new tags (if any) to _tags
    const info_tags = info.tag.split(" ").filter(String);
    info_tags.forEach(function (tag: string) {
      if (_tags.indexOf(tag) == -1) {
        _tags.push(tag);
      }
    });
  }
};
window.addPost = addPost;

const deletePost = function (url: string) {
  const userInfo = getUserInfo();
  if (userInfo && userInfo.isChecked && url) {
    const path = mainPath + "posts/delete";
    const settings: any = {
      url: path,
      type: "GET",
      timeout: REQ_TIME_OUT,
      dataType: "json",
      crossDomain: true,
      data: {
        url: url,
        format: "json"
      },
      contentType: "text/plain"
    };
    settings.data.auth_token = userInfo.authToken;
    const jqxhr = $.ajax(settings);
    jqxhr.always(function (data) {
      const resCode = data.result_code;
      if (resCode == "done" || resCode == "item not found") {
        delete pages[url];
        updateSelectedTabExtIcon();
        browser.runtime.sendMessage({
          type: "deletepost-succeed"
        });
      } else {
        browser.runtime.sendMessage({
          type: "deletepost-failed",
          error: "Delete failed: " + data.result_code
        });
      }
    });
    jqxhr.fail(function (data) {
      browser.runtime.sendMessage({
        type: "deletepost-failed",
        error: "Delete failed: " + data.statusText
      });
    });
  }
};
window.deletePost = deletePost;

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

const _tags: string[] = [],
  _tagsWithCount = {};
// acquire all user tags from server refresh _tags
const _getTags = () => {
  const userInfo = getUserInfo();
  if (userInfo && userInfo.isChecked && userInfo.authToken) {
    const path = mainPath + "tags/get",
      settings: any = {
        url: path,
        type: "GET",
        data: {format: "json"},
        timeout: REQ_TIME_OUT,
        dataType: "json",
        crossDomain: true,
        contentType: "text/plain"
      };
    settings.data.auth_token = userInfo.authToken;
    const jqxhr = $.ajax(settings);
    jqxhr.always(function (data) {
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
    });
  }
};
_getTags();

const getTags = function () {
  return _tags;
};
window.getTags = getTags;

const getTagsWithCount = function () {
  return _tagsWithCount;
};

// query at first time extension loaded
browser.tabs.query({ active: true, currentWindow: true })
  .then(tabs => {
    const tab = tabs[0];
    if (localStorage[StorageKeys.NoPing] === "true") {
      return;
    }
    logger.log("query tab pin state on loaded");
    attemptPageAction(tab);
    queryPinState({
      url: tab.url,
      ready: function (pageInfo: any) {
        if (pageInfo && pageInfo.isSaved) {
          browser.browserAction.setIcon(
            { path: yesIcon, tabId: tab.id });
          browser.pageAction.setIcon(
            { path: yesIcon, tabId: tab.id as number });
        } else {
          browser.browserAction.setIcon({ path: noIcon, tabId: tab.id });
          browser.pageAction.setIcon({ path: noIcon, tabId: tab.id as number });
        }
      }
    });
  });

browser.tabs.onUpdated.addListener(function (id, changeInfo, tab) {
  if (localStorage[StorageKeys.NoPing] === "true") {
    return;
  }
  if (changeInfo.url) {
    const url = changeInfo.url;
    if (!Object.hasOwn(pages, url)) {
      logger.log("query tab pin state on updated");
      browser.browserAction.setIcon({ path: noIcon, tabId: tab.id });
      attemptPageAction(tab);
      queryPinState({
        url: url,
        ready: function (pageInfo: any) {
          if (pageInfo && pageInfo.isSaved) {
            browser.browserAction.setIcon(
              { path: yesIcon, tabId: tab.id });
            browser.pageAction.setIcon(
              { path: yesIcon, tabId: tab.id as number });
          } else {
            browser.browserAction.setIcon({ path: noIcon, tabId: tab.id });
            browser.pageAction.setIcon({ path: noIcon, tabId: tab.id as number });
          }
        }
      });
    }
  }
  logger.log("set tab pin state on opening");
  const url: string = (changeInfo.url || tab.url) as string;
  attemptPageAction(tab);
  if (pages[url] && pages[url].isSaved) {
    browser.browserAction.setIcon({ path: yesIcon, tabId: tab.id });
    browser.pageAction.setIcon({ path: yesIcon, tabId: tab.id as number });
  }
});

browser.tabs.onActivated.addListener(function (activeInfo) {
  if (localStorage[StorageKeys.NoPing] === "true") {
    return;
  }
  browser.tabs.query({ active: true, currentWindow: true })
    .then(tabs => {
      const tab = tabs[0];
      const url = tab.url as string;
      if (!Object.hasOwn(pages, url)) {
        logger.log("query tab pin state on actived");
        attemptPageAction(tab);
        queryPinState({
          url: url,
          ready: function (pageInfo: any) {
            if (pageInfo && pageInfo.isSaved) {
              browser.browserAction.setIcon(
                { path: yesIcon, tabId: tab.id });
              browser.pageAction.setIcon(
                { path: yesIcon, tabId: tab.id as number });
            } else {
              browser.browserAction.setIcon({ path: noIcon, tabId: tab.id });
              browser.pageAction.setIcon({ path: noIcon, tabId: tab.id as number });
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
function attemptPageAction(tab: Tab) {
  browser.pageAction.hide(tab.id as number);
  if (localStorage[StorageKeys.NoPageAction] !== "true" && tab.url && (tab.url.indexOf("http://") !== -1 || tab.url.indexOf("https://") !== -1)) {
    browser.pageAction.show(tab.id as number);
  }
}
