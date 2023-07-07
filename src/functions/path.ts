import {mainPath} from '../common';

export const getSearchPath = (url: string) => {
  return mainPath + 'search/links?' + new URLSearchParams({
    per_page: '-1',
    query: url,
  });
};
