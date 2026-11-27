// Separate async entry point keeps the catalog out of global auth loading
// without mixing static and dynamic imports during the server build.
export { isProfileBannerUrl } from './profileBanners.ts'
