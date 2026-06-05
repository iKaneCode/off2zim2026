const MANUAL_LOGOUT_KEY = "off2zim_manual_logout_started_at";
const AUTH_NOTICE_KEY = "off2zim_auth_notice";
const POST_LOGOUT_REDIRECT_KEY = "off2zim_post_logout_redirect";
const MANUAL_LOGOUT_WINDOW_MS = 20000;

function getSessionStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage;
}

export function markManualLogout() {
  getSessionStorage()?.setItem(MANUAL_LOGOUT_KEY, String(Date.now()));
}

export function clearManualLogout() {
  getSessionStorage()?.removeItem(MANUAL_LOGOUT_KEY);
}

export function isManualLogoutInProgress() {
  const storage = getSessionStorage();
  const startedAt = Number(storage?.getItem(MANUAL_LOGOUT_KEY) || 0);

  if (!startedAt) {
    return false;
  }

  if (Date.now() - startedAt > MANUAL_LOGOUT_WINDOW_MS) {
    storage?.removeItem(MANUAL_LOGOUT_KEY);
    return false;
  }

  return true;
}

export function setSessionExpiredNotice(path?: string) {
  const storage = getSessionStorage();

  if (!storage) {
    return;
  }

  if (path) {
    storage.setItem(POST_LOGOUT_REDIRECT_KEY, path);
  }

  storage.setItem(AUTH_NOTICE_KEY, "session-expired");
}

export function getAuthNotice() {
  return getSessionStorage()?.getItem(AUTH_NOTICE_KEY) || null;
}

export function clearAuthLogoutState() {
  const storage = getSessionStorage();

  storage?.removeItem(AUTH_NOTICE_KEY);
  storage?.removeItem(POST_LOGOUT_REDIRECT_KEY);
}
