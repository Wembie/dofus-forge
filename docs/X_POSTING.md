# Automatic announcements on X

The release workflow publishes one post to X when a new version is pushed to `main` and a GitHub Release is created. It uses the first note from `docs/CHANGELOG.md` and links to Dofus Forge. Ordinary pushes do not publish. If the X credentials are not configured, the release succeeds and the post step is skipped.

## Configure credentials

1. Create an approved app in the [X Developer Console](https://developer.x.com/).
2. Set the app's OAuth 1.0a permission to **Read and write**, save, then generate the app keys and user access tokens. The user token must be generated after write permission is enabled.
3. In the GitHub repository, open **Settings → Secrets and variables → Actions → New repository secret** and add:

   - `X_API_KEY`
   - `X_API_SECRET`
   - `X_ACCESS_TOKEN`
   - `X_ACCESS_TOKEN_SECRET`

The release workflow reads these values as GitHub Actions secrets. Do not commit the keys or tokens to the repository. X requires a developer app and user access tokens to create posts with the [X API](https://docs.x.com/x-api/posts/manage-tweets/quickstart).

## Fix a 403 permission error

If X returns `oauth1-permissions`, the app or its user token lacks write permission. In the Developer Portal, change the OAuth 1.0a app permission to **Read, write, and direct messages**, save it, and generate a fresh Access Token and Access Token Secret. Replace `X_ACCESS_TOKEN` and `X_ACCESS_TOKEN_SECRET` in GitHub Actions; the consumer key and secret do not need to change.

If the GitHub Release was already created by the failed run, merge this workflow update to `main`, then open **Actions → Create Release → Run workflow** and enable `post_x_release`. That sends the current `VERSION` announcement without creating the release again. Future failed attempts can use **Re-run failed jobs**.

The workflow stores a hidden marker in the GitHub Release after X confirms the post. Re-runs check that marker and skip a release that this workflow already announced, preventing duplicate posts from retries.
