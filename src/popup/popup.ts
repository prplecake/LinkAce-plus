import {PageInfo, Scope} from '../models/Scope';
import {maxDescLen, StorageKeys} from '../common';
import {Link} from '../models/LinkAce/Link';
import './popup.scss';
import {Logger} from '../lib/logger';
import {byId, hide, show} from "../lib/htmlUtils";

const logger = new Logger('popup');

const bg: any = browser.extension.getBackgroundPage(), keyCode = {
  enter: 13, tab: 9, up: 38, down: 40, ctrl: 17, n: 78, p: 80, space: 32
}, SEC = 1000, MIN = SEC * 60, HOUR = MIN * 60, DAY = HOUR * 24, WEEK = DAY * 7;

// request permissions
const requestPermissions = async (url: string) => {
  const permissionsToRequest = {
    origins: [url.endsWith('/') ? url : url + '/']
  };
  const onResponse = (response: boolean) => {
    if (response) {
      logger.log('permission was granted');
    } else {
      logger.log('permission was refused');
    }
    return browser.permissions.getAll();
  };

  const response = await browser.permissions.request(permissionsToRequest);
  const currentPermissions = await onResponse(response);
  logger.log('Current permissions: ', currentPermissions);
};

const escapeHTML = function (str: string) {
  const replacements: { [id: string]: string } = {
    '&': '&amp;', '"': '&quot;', '\'': '&#39;', '<': '&lt;', '>': '&gt;'
  };
  return str.replace(/[&"'<>]/g, (m) => replacements[m]);
};

const getTimePassed = function (date: Date) {
  const ret = {week: 0, day: 0, hour: 0, min: 0, sec: 0, offset: -1},
    offset = new Date().getTime() - date.getTime();
  let r;
  if (offset <= 0) return ret;
  ret.offset = offset;
  ret.week = Math.floor(offset / WEEK);
  r = offset % WEEK;
  ret.day = Math.floor(offset / DAY);
  r = offset % DAY;
  ret.hour = Math.floor(r / HOUR);
  r = r % HOUR;
  ret.min = Math.floor(r / MIN);
  r = r % MIN;
  ret.sec = Math.floor(r / SEC);
  return ret;
};

const renderSavedTime = function (time: number) {
  const passed = getTimePassed(new Date(time));
  let dispStr = 'previously saved ';
  const w = passed.week, d = passed.day, h = passed.hour;
  if (passed.offset > WEEK) {
    dispStr = dispStr.concat(String(passed.week), ' ', 'weeks ago');
  } else if (passed.offset > DAY) {
    dispStr = dispStr.concat(String(passed.day), ' ', 'days ago');
  } else if (passed.offset > HOUR) {
    dispStr = dispStr.concat(String(passed.hour), ' ', 'hours ago');
  } else {
    dispStr = dispStr.concat('just now');
  }
  return dispStr;
};

const $scope: Scope = {
  loadingText: 'Loading...', userInfo: {}, pageInfo: {}
};

const $loading = byId('state-mask');
const $login = byId('login-window');
const $bookmark = byId('bookmark-window');
const $postform = byId('add-post-form');
const $autocomplete = byId('auto-complete');

[
  $loading, $login, $bookmark, $postform, $autocomplete
].forEach(elem => {
  if (elem) elem.style.display = 'none';
});

(() => {
  (byId('logo-link') as HTMLAnchorElement).href = localStorage[StorageKeys.Url];
})();

const renderLoading = function (loadingText?: string) {
  $scope.loadingText = loadingText || $scope.loadingText;
  if ($loading && $scope.isLoading === true) {
    $loading.textContent = $scope.loadingText;
    show($loading);
  } else {
    hide($loading);
  }
};
renderLoading();

const renderLoginPage = function () {
  logger.log('rendering login page');
  show($login);

  const $loginerr = byId('login-error');
  if ($scope.isLoginError === true) {
    show($loginerr);
  } else {
    hide($loginerr);
  }

  const $loginBtn = byId('login-btn');
  if ($loginBtn) $loginBtn.addEventListener('click', loginSubmit);
};

browser.runtime.onMessage.addListener((message: any) => {
  logger.log('receive message: ' + JSON.stringify(message));
  if (message.type === 'login-succeed') {
    $scope.isLoading = false;
    $scope.isLoginError = false;

    renderUserInfo();
    hide($loading);
    renderBookmarkPage();
  } else if (message.type === 'login-failed') {
    $scope.isLoading = false;
    $scope.isLoginError = true;

    hide($loading);
    renderLoginPage();
  } else if (message.type === 'logged-out') {
    $scope.isAnony = true;
    $scope.isLoading = false;
    $scope.isLoginError = false;

    hide($bookmark);
    hide($loading);
    renderLoginPage();
  } else if (message.type === 'render-suggests') {
    $scope.suggests = message.data;
  } else if (message.type === 'render-page-info') {
    if (message.data) {
      browser.tabs.query({active: true, currentWindow: true})
        .then((tabs) => {
          const tab = tabs[0];
          let pageInfo: PageInfo = message.data;
          if (pageInfo.isSaved == false) {
            pageInfo = {
              url: tab.url, title: tab.title, tag: '', desc: ''
            };
            pageInfo.shared = (localStorage[StorageKeys.AllPrivate] !== 'true');
            pageInfo.isSaved = false;
          }
          if (pageInfo.tag) {
            pageInfo.tag = pageInfo.tag.concat(' ');
          }
          pageInfo.isPrivate = !pageInfo.shared;
          $scope.pageInfo = Object.assign({}, pageInfo);

          (byId('url') as HTMLInputElement).value = (pageInfo.url as string);
          (byId(
            'title') as HTMLInputElement).value = (pageInfo.title as string);
          (byId('tag') as HTMLInputElement).value = pageInfo.tag ?? '';
          logger.log('desc: ', pageInfo.desc);
          if (!pageInfo.desc) {
            // TODO: resolve dependency on chrome
            chrome.tabs.sendMessage(tab.id as number, {
              method: 'getDescription'
            }, function (response) {
              logger.log(response);
              if (response && response.data.length !== 0) {
                let desc = response.data;
                logger.log('desc: ', desc);
                if (desc.length > maxDescLen) {
                  desc = desc.slice(0, maxDescLen) + '...';
                }
                pageInfo.desc = desc;
                (byId(
                  'desc') as HTMLInputElement).value = pageInfo.desc as string;
              }
            });
          } else {
            (byId('desc') as HTMLInputElement).value = pageInfo.desc;
          }

          if (pageInfo.isPrivate) {
            (byId('private') as HTMLInputElement).checked = true;
          }
          if (pageInfo.toread === true) {
            (byId('toread') as HTMLInputElement).checked = true;
          }

          renderError();

          const $savetime = byId('alert-savetime');
          if ($savetime) hide($savetime);
          if ($savetime && pageInfo.time) {
            $savetime.textContent = renderSavedTime(pageInfo.time);
            show($savetime);
          }

          if (pageInfo.isSaved === true) {
            const $optDelete = byId('opt-delete');
            if ($optDelete) {
              $optDelete.addEventListener('click', function () {
                const $optCancelDelete = byId('opt-cancel-delete');
                const $optConfirm = byId('opt-confirm');
                if ($optCancelDelete) {
                  $optCancelDelete.addEventListener('click', function () {
                    if ($optConfirm) hide($optConfirm);
                    show($optDelete);
                    return false;
                  });
                }

                const $optDestroy = byId('opt-destroy');
                if ($optDestroy) {
                  $optDestroy.addEventListener('click', function () {
                    postDelete();
                    return false;
                  });
                }

                hide($optDelete);
                show($optConfirm);
                return false;
              });
              show($optDelete);
            }
          }
          if ($postform) {
            $postform.addEventListener('submit', () => {
              postSubmit();
              return false;
            });
          }
          $scope.isLoading = false;
          renderLoading();
          if ($postform) show($postform);
        });
    } else {
      logger.log('query bookmark info error');
      $scope.loadingText = 'Query bookmark info error';
      $scope.isLoading = true;
      renderLoading();
    }
  } else if (message.type === 'addpost-succeed') {
    $scope.isPostError = false;
    window.close();
  } else if (message.type === 'addpost-failed') {
    $scope.isLoading = false;
    $scope.isPostError = true;
    $scope.postErrorText = message.error;
    renderError();
    renderLoading();
  }
});

const loginSubmit = () => {
  const linkAceUrl = (byId('linkAceUrl') as HTMLInputElement).value,
    authToken = (byId('token') as HTMLInputElement).value;
  requestPermissions(linkAceUrl);
  if (linkAceUrl && authToken) {
    $scope.loadingText = 'log in...';
    $scope.isLoading = true;
    hide($login);
    renderLoading();
    bg.login({url: linkAceUrl, token: authToken});
    return false;
  }
};

const renderPageHeader = () => {
  const $logoutLink = byId('logout-link');
  if ($logoutLink) {
    $logoutLink.addEventListener('click', function () {
      logger.log('log out...');
      $scope.isLoading = true;
      $scope.loadingText = 'Log out...';
      renderLoading();
      bg.logout();
    });
  }
};

const renderError = () => {
  const $posterr = byId('alert-error-div');
  if ($posterr) hide($posterr);
  if ($posterr && $scope.isPostError === true) {
    $posterr.textContent = $scope.postErrorText as string;
    show($posterr);
    show($postform);
  } else {
    if ($posterr) hide($posterr);
  }
};

const renderBookmarkPage = () => {
  logger.log('rendering bookmark page');
  if ($bookmark) show($bookmark);
  renderPageHeader();
  browser.tabs.query({active: true, currentWindow: true})
    .then((tabs) => {
      const tab = tabs[0];
      if (tab.url && tab.url.indexOf('http://') !== 0 && tab.url.indexOf(
        'https://') !== 0 && tab.url.indexOf('ftp://') !== 0) {
        logger.log('invalid tab');
        $scope.loadingText = 'Please select a valid tab';
        $scope.isLoading = true;
        renderLoading();
        return;
      }

      $scope.loadingText = 'Loading bookmark...';
      $scope.isLoading = true;
      renderLoading();

      bg.getPageInfo(tab.url);
    });
};

const postSubmit = () => {
  logger.log('post new bookmark');
  $scope.isLoading = true;
  $scope.loadingText = 'Saving...';
  hide($postform);
  $scope.isPostError = false;
  renderError();
  renderLoading();

  const info: Link = {
    url: (byId('url') as HTMLInputElement).value,
    title: (byId('title') as HTMLInputElement).value,
    description: (byId('desc') as HTMLInputElement).value,
    lists: (byId('list') as HTMLInputElement).value,
    tags: (byId('tag') as HTMLInputElement).value,
  };
  logger.log('link info: ', info);

  info.is_private = (byId('private') as HTMLInputElement).checked;
  bg.addPost(info);
};

const postDelete = () => {
  logger.log('delete bookmark');
  $scope.isLoading = true;
  $scope.loadingText = 'Deleting...';
  hide($postform);
  $scope.isPostError = false;
  renderError();
  renderLoading();
  browser.tabs.query({active: true, currentWindow: true})
    .then((tabs) => {
      const tab = tabs[0];
      bg.deletePost(tab.url);
    });
};

const $linkAceUrl = byId('linkAceUrl');
if ($linkAceUrl) {
  $linkAceUrl.addEventListener('input', () => {
    const val = ($linkAceUrl as HTMLInputElement).value;
    console.log(val);
    const $linkAceSettingsUrl = byId('linkAceSettingsUrl');
    if ($linkAceSettingsUrl) {
      ($linkAceSettingsUrl as HTMLAnchorElement).href = `${val}/settings`;
    }
  });
}

const $optionLink = byId('option-link');
if ($optionLink) {
  $optionLink.addEventListener('click', function () {
    browser.runtime.openOptionsPage();
  });
}

const renderUserInfo = () => {
  const userInfo = bg.getUserInfo();
  $scope.userInfo = userInfo;
  $scope.isAnony = !userInfo || !userInfo.isChecked;
};

renderUserInfo();
$scope.isLoading = false;
if ($scope.isAnony) {
  renderLoading();
  renderLoginPage();
} else {
  renderBookmarkPage();
}

logger.log($scope);
