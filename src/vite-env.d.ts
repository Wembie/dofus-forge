/// <reference types="vite/client" />

declare const __APP_VERSION__: string
declare const __DOFUS_VERSION__: string

interface ImportMetaEnv {
  /** Public domain of the assets R2 bucket (items/, chars/), e.g. https://assets.dofusforge.com/; unset = Worker routes. */
  readonly VITE_ASSETS_URL?: string
}
