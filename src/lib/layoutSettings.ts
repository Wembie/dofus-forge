const LS_KEY = 'dofus-forge-sidebar-side'
export const LAYOUT_SETTINGS_EVENT = 'forge-layout-settings-change'

export type SidebarSide = 'left' | 'right'

/** Which side the planner's characteristics/stats sidebar sits on (desktop
 * only — mobile already stacks everything via tabs, no "side" to speak of).
 * Requested by a user whose friend has muscle memory for it on the left from
 * other build planners. */
export function getSidebarSide(): SidebarSide {
  return localStorage.getItem(LS_KEY) === 'left' ? 'left' : 'right'
}

export function setSidebarSide(side: SidebarSide) {
  localStorage.setItem(LS_KEY, side)
  window.dispatchEvent(new Event(LAYOUT_SETTINGS_EVENT))
}
