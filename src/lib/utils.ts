export const validProto = (url?: string) => {
  if (url) {
    return ((url.indexOf('http://') !== -1 || url.indexOf('https://') !== -1 || url.indexOf('ftp://') !== -1));
  }
  return false;
};