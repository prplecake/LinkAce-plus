export const getDefaultHeaders = (userInfo?: any, token?: string) => {
  let authHeader = '';
  if (userInfo) authHeader = `Bearer ${userInfo.token}`;
  if (token) authHeader = `Bearer ${token}`;
  if (!userInfo && !token) return undefined;
  return new Headers({
    Authorization: authHeader,
    Accept: 'application/json',
  });
};
