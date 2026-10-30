// Never a real build id or username (usernames are 3-30 chars; not "_",
// which React Router reserves in data URLs: /u/_.data means /u/). One page of
// each is always prerendered so the build and profile routes stay valid for
// prerendering when there is no data to render (CI has no Supabase). Their
// loaders return the "not found" state without querying anything.
export const SENTINEL_BUILD_ID = '00000000-0000-0000-0000-000000000000'
export const SENTINEL_USERNAME = '-'
