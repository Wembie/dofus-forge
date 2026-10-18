# X post drafts

The release workflow does not publish through the X API, so it does not use X credits. Instead, it prepares an English post for you to copy and publish manually. The Dofus Forge X link remains in the site footer.

## Get the draft

- For a new release, push a `VERSION` change to `main`. Open that run under **Actions → Create Release** and copy the post from its summary.
- For the current version, open **Actions → Create Release → Run workflow**. This prepares the draft without creating another release when its tag already exists.

The generated text includes the version, site link, and `#Dofus #DofusForge #MMORPG`. Its wording is intentionally generic and always in English; edit it before posting if you want to mention a particular feature.
