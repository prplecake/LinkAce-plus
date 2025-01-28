export const getDefaultHeaders = (userInfo?: any, token?: string) => {
  let authHeader = "";
  if (userInfo) authHeader = `Bearer ${userInfo.authToken}`;
  if (token) authHeader = `Bearer ${token}`;
  if (!userInfo && !token) return undefined;
  return {
    Authorization: authHeader,
    Accept: "application/json",
  };
};
