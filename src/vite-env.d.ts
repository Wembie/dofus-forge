/// <reference types="vite/client" />

declare const __APP_VERSION__: string
declare const __DOFUS_VERSION__: string

interface ImportMetaEnv {
  /** Public domain of the item icons R2 bucket (e.g. https://items.dofusforge.com/); unset = Worker route. */
  readonly VITE_ITEM_ASSETS_URL?: string
  /** Public domain of the character assets R2 bucket; unset = Worker /char/ route. */
  readonly VITE_CHAR_ASSETS_URL?: string
}
