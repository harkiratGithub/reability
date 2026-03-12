# Issue: "Session Terminated" Modal Appears After Logout

## Symptom

After clicking logout, users occasionally see:

> **Connection request**
> Session terminated due to connecting in another machine or session timed out

## Root Cause

Race condition in the logout flow:

1. `AuthenticationService.logout()` awaits `ajax.logout()` → this destroys the server session
2. While waiting, the heartbeat `setInterval` (running every N seconds) fires and sends a request to the now-dead session
3. The server responds with **401**
4. `ErrorInterceptor` catches the 401, sees it's not a login URL, and opens the modal
5. Only *after* `ajax.logout()` resolves does `finally` call `closeHeartBeatInterval()`

**Files involved:**
- `client/src/app/common/services/authentication.service.ts` — logout flow + heartbeat
- `client/src/app/common/auth/error.interceptor.ts` — 401 handler that opens the modal

## Fix

Move `closeHeartBeatInterval()` to **before** `ajax.logout()` in `authentication.service.ts`:

```ts
// Before (buggy)
logout = async () => {
  try {
    const currentUser = this.currentUserValue;
    await this.ajax.logout().toPromise();  // session destroyed here
    // ...
  } finally {
    this.currentUserSubject.next(null);
    this.closeHeartBeatInterval();         // heartbeat stopped too late
    this.router.navigate([ROUTES.LOGIN]);
  }
};

// After (fixed)
logout = async () => {
  try {
    const currentUser = this.currentUserValue;
    this.closeHeartBeatInterval();         // stop heartbeat first
    await this.ajax.logout().toPromise();  // now safe to destroy session
    // ...
  } finally {
    this.currentUserSubject.next(null);
    this.router.navigate([ROUTES.LOGIN]);
  }
};
```

## Verification

1. Log in → wait a few seconds for the heartbeat to be active
2. Click logout
3. Confirm no "Session terminated" modal appears
4. Confirm redirection to `/login` works normally
