# Automatic announcements on X

The release workflow publishes one post to X when a new version is pushed to `main` and a GitHub Release is created. It uses the first note from `docs/CHANGELOG.md` and links to Dofus Forge. Ordinary pushes do not publish. If the X credentials are not configured, the release succeeds and the post step is skipped.

## Configure credentials

1. Create an approved app in the [X Developer Console](https://developer.x.com/).
2. Enable OAuth 1.0a with read and write permissions, then generate the app keys and user access tokens.
3. In the GitHub repository, open **Settings → Secrets and variables → Actions → New repository secret** and add:

   - `X_API_KEY`
   - `X_API_SECRET`
   - `X_ACCESS_TOKEN`
   - `X_ACCESS_TOKEN_SECRET`

The release workflow reads these values as GitHub Actions secrets. Do not commit the keys or tokens to the repository. X requires a developer app and user access tokens to create posts with the [X API](https://docs.x.com/x-api/posts/manage-tweets/quickstart).
