import {PageInfo, Scope} from '../models/Scope';
import {maxDescLen, StorageKeys} from '../common';
import {Link} from '../models/LinkAce/Link';
import './popup.scss';
import {byId, hide, show} from "../lib/htmlUtils";

const bg: any = browser.extension.getBackgroundPage(),
  keyCode = {enter: 13, tab: 9, up: 38, down: 40, ctrl: 17, n: 78, p: 80, space: 32},
  SEC = 1000, MIN = SEC * 60, HOUR = MIN * 60, DAY = HOUR * 24, WEEK = DAY * 7;

// request permissions
const requestPermissions = async (url: string) => {
  const permissionsToRequest = {
    origins: [url.endsWith('/') ? url : url + '/']
  };
  const onResponse = (response: boolean) => {
    if (response) {
      console.log('permission was granted');
    } else {
      console.log('permission was refused');
    }
    return browser.permissions.getAll();
  };

  const response = await browser.permissions.request(permissionsToRequest);
  const currentPermissions = await onResponse(response);
  console.log('Current permissions: ', currentPermissions);
};

const escapeHTML = function (str: string) {
  const replacements: { [id: string]: string } = {'&': '&amp;', '"': '&quot;', '\'': '&#39;', '<': '&lt;', '>': '&gt;'};
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
  loadingText: 'Loading...',
  userInfo: {},
  pageInfo: {}
};

const $loading = byId('state-mask');
const $login = byId('login-window');
const $bookmark = byId('bookmark-window');
const $postform = byId('add-post-form');
const $autocomplete = byId('auto-complete');

[
  $loading,
  $login,
  $bookmark,
  $postform,
  $autocomplete
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
  console.log('rendering login page');
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
  console.log('receive message: ' + JSON.stringify(message));
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
    renderSuggest();
  } else if (message.type === 'render-page-info') {
    if (message.data) {
      browser.tabs.query({active: true, currentWindow: true})
        .then((tabs) => {
          const tab = tabs[0];
          let pageInfo: PageInfo = message.data;
          if (pageInfo.isSaved == false) {
            pageInfo = {
              url: tab.url,
              title: tab.title,
              tag: '',
              desc: ''
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
          (byId('title') as HTMLInputElement).value = (pageInfo.title as string);
          (byId('tag') as HTMLInputElement).value = (pageInfo.tag as string);
          console.log('desc: ', pageInfo.desc);
          if (!pageInfo.desc) {
            // TODO: resolve dependency on chrome
            chrome.tabs.sendMessage(
              tab.id as number, {
                method: 'getDescription'
              },
              function (response) {
                console.log(response);
                if (typeof response !== 'undefined' &&
                  response.data.length !== 0) {
                  let desc = response.data;
                  console.log('desc: ', desc);
                  if (desc.length > maxDescLen) {
                    desc = desc.slice(0, maxDescLen) + '...';
                  }
                  pageInfo.desc = desc;
                  (byId('desc') as HTMLInputElement).value = pageInfo.desc as string;
                }
              }
            );
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

          const $tag = byId('tag');
          if ($tag) {
            $tag.addEventListener('change keyup paste', function (e) {
              const code = e.charCode ? e.charCode : e.keyCode;
              if (code && $.inArray(code, [keyCode.enter, keyCode.tab, keyCode.up, keyCode.down,
                keyCode.n, keyCode.p, keyCode.ctrl, keyCode.space]) === -1) {
                $scope.pageInfo.tag = $('#tag').val() as string;
                renderSuggest();
                showAutoComplete();
              }
            });
            $tag.addEventListener('keydown', function (e) {
              chooseTag(e);
              renderSuggest();
            });

            if ($postform) $postform.addEventListener('submit', function () {
              postSubmit();
              return false;
            });

            $scope.isLoading = false;
            renderLoading();

            if ($postform) show($postform);

            $tag.focus();
          }
        });
    } else {
      console.log('query bookmark info error');
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
  } else if (message.type === 'deletepost-succeed') {
    $scope.isPostError = false;
    window.close();
  } else if (message.type === 'deletepost-failed') {
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
  if ($logoutLink) $logoutLink.addEventListener('click', function () {
    console.log('log out...');
    $scope.isLoading = true;
    $scope.loadingText = 'Log out...';
    renderLoading();
    bg.logout();
  });
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
  console.log('rendering bookmark page');
  if ($bookmark) show($bookmark);
  renderPageHeader();
  browser.tabs.query({active: true, currentWindow: true})
    .then((tabs) => {
      const tab = tabs[0];
      if (tab.url && tab.url.indexOf('http://') !== 0 && tab.url.indexOf('https://') !== 0 && tab.url.indexOf('ftp://') !== 0) {
        console.log('invalid tab');
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

const chooseTag = (e: KeyDownEvent) => {
  let newItems;
  let idx;
  const code = e.charCode ? e.charCode : e.keyCode;
  if (code && $.inArray(code, [keyCode.enter, keyCode.tab, keyCode.up, keyCode.down,
    keyCode.n, keyCode.p, keyCode.ctrl, keyCode.space]) !== -1) {
    if (code == keyCode.enter || code == keyCode.tab) {
      if ($scope.isShowAutoComplete) {
        e.preventDefault();
        // submit tag
        const items = $scope.pageInfo.tag.split(' '),
          tag = $scope.autoCompleteItems[$scope.activeItemIndex];
        items.splice(items.length - 1, 1, tag.text);
        $scope.pageInfo.tag = items.join(' ') + ' ';
        $('#tag').val($scope.pageInfo.tag);
        $scope.isShowAutoComplete = false;
        renderAutoComplete();
      } else if (code == keyCode.enter) {
        postSubmit();
        return false;
      }
    } else if (code == keyCode.down ||
      (code == keyCode.n && e.ctrlKey)) {
      // move up one item
      e.preventDefault();
      idx = $scope.activeItemIndex + 1;
      if (idx >= $scope.autoCompleteItems.length) {
        idx = 0;
      }
      newItems = $scope.autoCompleteItems.map(function (item) {
        return {text: item.text, isActive: false};
      });
      $scope.autoCompleteItems = newItems;
      $scope.activeItemIndex = idx;
      $scope.autoCompleteItems[idx].isActive = true;
      renderAutoComplete();
    } else if (code == keyCode.up ||
      (code == keyCode.p && e.ctrlKey)) {
      // move down one item
      e.preventDefault();
      idx = $scope.activeItemIndex - 1;
      if (idx < 0) {
        idx = $scope.autoCompleteItems.length - 1;
      }
      newItems = $scope.autoCompleteItems.map(function (item) {
        return {text: item.text, isActive: false};
      });
      $scope.autoCompleteItems = newItems;
      $scope.activeItemIndex = idx;
      $scope.autoCompleteItems[idx].isActive = true;
      renderAutoComplete();
    } else if (code == keyCode.space) {
      $scope.isShowAutoComplete = false;
      renderAutoComplete();
    }
  }
};

const showAutoComplete = () => {
  const items = $scope.pageInfo.tag.split(' ');
  let word = items[items.length - 1];
  const MAX_SHOWN_ITEMS = 5;
  if (word) {
    word = word.toLowerCase();
    const allTags: string[] = $scope.allTags;
    let shownCount = 0;
    const autoCompleteItems = [];
    let i = 0;
    const len = allTags.length;
    for (; i < len && shownCount < MAX_SHOWN_ITEMS; i++) {
      const tag = allTags[i].toLowerCase();
      if (tag.indexOf(word) == 0 && $.inArray(tag, items) === -1) {
        const item = {text: tag, isActive: false};
        autoCompleteItems.push(item);
        shownCount += 1;
      }
    }
    if (shownCount) {
      $scope.autoCompleteItems = autoCompleteItems.reverse();
      $scope.autoCompleteItems[0].isActive = true;
      $scope.activeItemIndex = 0;
      $scope.isShowAutoComplete = true;
      const tagEl = $('#tag'),
        pos = $('#tag').offset();
      pos.top = pos.top + tagEl.outerHeight();
      $autocomplete.css({'left': pos.left, 'top': pos.top});
    } else {
      $scope.isShowAutoComplete = false;
    }
  } else {
    $scope.isShowAutoComplete = false;
  }
  renderAutoComplete();
};

const renderAutoComplete = () => {
  if ($scope.isShowAutoComplete === true) {
    $('#auto-complete ul').html('');
    $.each($scope.autoCompleteItems, function (index, item) {
      let cls = '';
      if (item.isActive) {
        cls = 'active';
      }
      $('#auto-complete ul').append('<li class="' + cls + '">' + escapeHTML(item.text) + '</li>');
    });
    $autocomplete.show();
  } else {
    $autocomplete.hide();
  }
};

const renderSuggest = () => {
  if ($scope.suggests && $scope.suggests.length > 0) {
    $('#suggest').html('');
    $.each($scope.suggests, function (index, suggest) {
      let cls = 'add-tag';
      if ($scope.pageInfo.tag.split(' ').indexOf(suggest) != -1) {
        cls += ' selected';
      }
      $('#suggest').append('<a href="#" class="' + cls + '">' + escapeHTML(suggest) + '</a>');
    });
    $('#suggest').append('<a href="#" class="add-all-tag">Add all</a>');
    $('.add-tag').off('click').on('click', function () {
      const tag = $(this).text();
      addTags([tag]);
      $(this).addClass('selected');
    });
    $('.add-all-tag').off('click').on('click', function () {
      addTags([$scope.suggests as string]); // TODO?
    });
    $('#suggest-list').show();
  } else {
    $('#suggest-list').hide();
  }
};

const addTag = (s: string) => {
  const t = $scope.pageInfo.tag.trim();
  // skip if tag already added
  if ($.inArray(s, t.split(' ')) === -1) {
    $scope.pageInfo.tag = t + ' ' + s + ' ';
  }
  $('#tag').val($scope.pageInfo.tag);
};

const addTags = (tags: string[]) => {
  $.each(tags, function (index, tag) {
    addTag(tag);
  });
};

const postSubmit = () => {
  console.log('post new bookmark');
  $scope.isLoading = true;
  $scope.loadingText = 'Saving...';
  $postform.hide();
  $scope.isPostError = false;
  renderError();
  renderLoading();

  const info: Link = {
    url: $('#url').val() as string,
    title: $('#title').val() as string,
    description: $('#desc').val() as string,
    lists: $('#list').val() as string,
    tags: $('#tag').val() as string,
  };
  console.log('link info: ', info);

  info.is_private = !!$('#private').prop('checked');
  bg.addPost(info);
};

const postDelete = () => {
  console.log('delete bookmark');
  $scope.isLoading = true;
  $scope.loadingText = 'Deleting...';
  $postform.hide();
  $scope.isPostError = false;
  renderError();
  renderLoading();
  browser.tabs.query({active: true, currentWindow: true})
    .then((tabs) => {
      const tab = tabs[0];
      bg.deletePost(tab.url);
    });
};

$('#linkAceUrl').on('input', () => {
  const val = $('#linkAceUrl').val();
  console.log(val);
  $('#linkAceSettingsUrl').attr('href', `${val}/settings`);
});

$('.link').on('click', function () {
  const url = $(this).attr('href');
  browser.tabs.query({})
    .then((tabs) => {
      const index = tabs.length;
      browser.tabs.create({url: url, index: index});
      window.close();
    });
  return false;
});

$('#option-link').off('click').on('click', function () {
  browser.runtime.openOptionsPage();
});

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

console.log($scope);
