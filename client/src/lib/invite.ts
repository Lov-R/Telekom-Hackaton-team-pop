/**
 * Invite links look like /prijatelji?kod=ABC123. The code is kept for the session, so a friend who still has
 * to sign in or register is connected right after.
 */
const INVITE_KEY = 'relai.invite';

export const inviteUrl = (code: string): string => `${window.location.origin}/prijatelji?kod=${encodeURIComponent(code)}`;

/** Called once at startup. */
export function captureInvite(): void {
  try {
    const code = new URLSearchParams(window.location.search).get('kod');
    if (code) sessionStorage.setItem(INVITE_KEY, code);
  } catch {
    /* storage unavailable: the link still opens the page with the code in the URL */
  }
}

export function takePendingInvite(): string | null {
  try {
    const code = sessionStorage.getItem(INVITE_KEY);
    sessionStorage.removeItem(INVITE_KEY);
    return code;
  } catch {
    return null;
  }
}
