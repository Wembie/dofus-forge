/** Opens the sign-in window from anywhere (the header's AuthButton listens). */
export const SIGN_IN_EVENT = 'dofus-forge:sign-in'

export function requestSignIn() {
  window.dispatchEvent(new Event(SIGN_IN_EVENT))
}
