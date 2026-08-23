export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Local authentication is handled by the server through an HttpOnly cookie.
// No credentials, tokens, OAuth URLs, or session secrets are exposed to the browser.
export const LOCAL_LOGIN_PATH = "/login";
