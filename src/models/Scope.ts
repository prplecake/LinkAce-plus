export interface UserInfo {
  apiUrl?: string,
  authToken?: string,
  isChecked?: boolean,
}

export interface PageInfo {
  tag?: string,
  isSaved?: boolean,
  url?: string,
  title?: string,
  desc?: string,
  shared?: boolean,
  toread?: boolean,
  isPrivate?: boolean,
  time?: number,
}

interface AutoCompleteItem {
  text: string,
  isActive: boolean
}

export interface Scope {
  loadingText: string
  userInfo: UserInfo,
  pageInfo: PageInfo,
  isLoading?: boolean,
  isLoginError?: boolean,
  isAnony?: boolean,
  isPostError?: boolean,
  suggests?: string,
  postErrorText?: string,
  allTags?: [],
  isShowAutoComplete?: boolean,
  autoCompleteItems?: AutoCompleteItem[],
  activeItemIndex?: number,

}