import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
expect.configure({ timeout: 10000 });
const root = "http://127.0.0.1:4404/surfaces.html",
  other = root + "?view=build&example=explore-00",
  mine = root + "?view=build&build=library-0",
  output = "docs/design-v0.4/captures/detalle-build",
  report = "docs/design-v0.4/checks/build-detail.json";
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
    headless: true,
    args: [
      "--enable-webgl",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  }),
  results = [];
async function create(width, height) {
  const context = await browser.newContext({ viewport: { width, height } }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const path of ["**/auth/v1/**", "**/rest/v1/**"])
    await context.route(path, (route) => {
      errors.push("Unexpected cloud request");
      return route.abort();
    });
  return { context, page, errors };
}
async function open(page, url) {
  await page.goto(url, { waitUntil: "networkidle" });
  await expect(page.locator(".detail-hero h1")).toBeVisible();
}
async function review(page, index, value) {
  await page.evaluate(() => scrollTo(0, 0));
  const panel = page.locator(".detail-review");
  if (!(await panel.evaluate((e) => e.open)))
    await panel.locator("summary").click();
  await panel.locator("select").nth(index).selectOption(value);
}
const scene = (page, value) => review(page, 0, value),
  session = (page, value) => review(page, 1, value);
async function inspect(page, id, device, theme, lang, errors) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images).map((img) => {
        img.loading = "eager";
        return Promise.race([
          img.decode().catch(() => {}),
          new Promise((resolve) => setTimeout(resolve, 3000)),
        ]);
      }),
    );
  });
  await page.waitForTimeout(300);
  const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .exclude("canvas")
      .analyze(),
    geometry = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      // Text that would be cut inside its box: names, labels and numbers.
      clipped: Array.from(
        document.querySelectorAll(
          ".detail-grid dt, .detail-chars li > span, .detail-numbers dd, .detail-social button, .detail-history b",
        ),
      ).filter((el) => el.scrollWidth > el.clientWidth + 1).length,
      smallTargets: Array.from(
        document.querySelectorAll(
          ".detail-study button, .detail-study a, .surface-dialog button",
        ),
      ).filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width && r.height && r.height < 32;
      }).length,
    }));
  if (["desktop", "mobile"].includes(device))
    await page.screenshot({
      path: `${output}/${id}-${device}-${theme}-${lang}.png`,
      fullPage: !(await page.getByRole("dialog").count()),
    });
  results.push({
    id,
    device,
    theme,
    lang,
    geometry,
    errors: [...errors],
    violations: axe.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  });
  errors.length = 0;
  fs.writeFileSync(report, JSON.stringify(results, null, 2) + "\n");
}

for (const [device, width, height] of [
  ["desktop", 1440, 1000],
  ["laptop", 1366, 900],
  ["tablet", 768, 1024],
  ["mobile", 390, 844],
  ["small-mobile", 360, 800],
])
  for (const theme of ["tinta", "mineral"]) {
    const { context, page, errors } = await create(width, height);
    await open(page, other);
    if (theme === "mineral")
      await page.getByRole("button", { name: "Cambiar tema", exact: true }).click();
    await inspect(page, "visitor", device, theme, "es", errors);
    await open(page, mine);
    if (theme === "mineral")
      await page.getByRole("button", { name: "Cambiar tema", exact: true }).click();
    await inspect(page, "owner", device, theme, "es", errors);
    if (["desktop", "mobile"].includes(device)) {
      await page
        .locator(".detail-history li")
        .first()
        .getByRole("button", { name: "Restaurar", exact: true })
        .click();
      await inspect(page, "restore", device, theme, "es", errors);
      await page.keyboard.press("Escape");
      await open(page, other);
      if (theme === "mineral")
        await page.getByRole("button", { name: "Cambiar tema", exact: true }).click();
      await page.locator(".detail-social").getByRole("button", { name: "Reportar" }).click();
      await inspect(page, "report", device, theme, "es", errors);
      await page.keyboard.press("Escape");
      await session(page, "admin");
      await inspect(page, "admin", device, theme, "es", errors);
      await session(page, "out");
      await inspect(page, "signed-out", device, theme, "es", errors);
      await session(page, "in");
      for (const s of ["remix", "remix-missing", "quiet", "not-found", "loading"]) {
        await scene(page, s);
        if (s === "loading") await expect(page.locator(".detail-loading")).toBeVisible();
        else if (s === "not-found") await expect(page.locator(".detail-missing h1")).toBeVisible();
        else await expect(page.locator(".detail-hero h1")).toBeVisible();
        await inspect(page, s, device, theme, "es", errors);
      }
      await scene(page, "normal");
      await expect(page.locator(".detail-hero h1")).toBeVisible();
      for (const lang of ["en", "fr", "pt"]) {
        await review(page, 2, lang);
        await inspect(page, "language", device, theme, lang, errors);
      }
    }
    await context.close();
    console.log(device, theme, "checked");
  }

// Journeys: every production capability, on the study's local examples.
const { context, page, errors } = await create(1440, 1000);
await open(page, other);
const title = await page.locator(".detail-hero h1").innerText();
// Someone else's public build: remix link, never an edit link.
const cta = page.locator(".detail-cta a");
await expect(cta).toHaveAttribute("href", /\?b=.+&fork=explore-00$/);
await expect(cta).toContainText("Hacer un remix");
// Like, save and rate are optimistic and reversible.
const like = page.locator(".detail-social button").first();
const likes = Number(await like.locator("b").innerText());
await like.click();
await expect(like).toHaveAttribute("aria-pressed", "true");
await expect(like.locator("b")).toHaveText(String(likes + 1));
await like.click();
await expect(like.locator("b")).toHaveText(String(likes));
const save = page.locator(".detail-social").getByRole("button", { name: "Guardar", exact: true });
await save.click();
await expect(page.locator(".detail-social").getByRole("button", { name: "Guardada" })).toHaveAttribute("aria-pressed", "true");
await page.getByRole("button", { name: "Valorar con 5 de 5" }).click();
await expect(page.getByRole("button", { name: "Valorar con 5 de 5" })).toHaveAttribute("aria-pressed", "true");
// Gear pieces reveal their effects on focus.
await page.locator(".detail-tile[tabindex]").first().focus();
await expect(page.locator(".item-peek")).toBeVisible();
await page.locator(".detail-tile[tabindex]").first().blur();
// The sheet carries the six characteristics, five elements and every combat line.
await expect(page.locator(".detail-chars li")).toHaveCount(6);
await expect(page.locator(".detail-elements tbody tr")).toHaveCount(5);
await expect(page.locator(".detail-stats .detail-grid > div")).toHaveCount(25);
// A comment lands at the end of the thread; the counter follows what is typed.
const box = page.locator(".detail-comment-form textarea");
await box.fill("Probaría con otro anillo.");
await expect(page.locator(".detail-comment-form .detail-count")).toHaveText("25 / 2000");
const before = await page.locator(".detail-comment").count();
await page.getByRole("button", { name: "Comentar", exact: true }).click();
await expect(page.locator(".detail-comment")).toHaveCount(before + 1);
await expect(page.locator(".detail-comment-text").last()).toHaveText("Probaría con otro anillo.");
await expect(box).toHaveValue("");
// Own comments can't be reported; others can, once.
await expect(page.locator(".detail-comment").last().getByRole("button", { name: /Reportar/ })).toHaveCount(0);
await page.locator(".detail-comment").first().getByRole("button", { name: /Reportar/ }).click();
await page.getByRole("radio", { name: "Datos incorrectos o engañosos" }).check();
await page.getByRole("button", { name: "Enviar reporte", exact: true }).click();
await expect(page.getByRole("dialog")).toContainText("Gracias");
await page.getByRole("dialog").getByRole("button", { name: "Cerrar", exact: true }).last().click();
await page.locator(".detail-comment").first().getByRole("button", { name: /Reportar/ }).click();
await page.getByRole("button", { name: "Enviar reporte", exact: true }).click();
await expect(page.getByRole("dialog")).toContainText("Ya habías reportado");
await page.keyboard.press("Escape");
// A failing action is undone and announced.
await scene(page, "action-error");
await expect(page.locator(".detail-hero h1")).toBeVisible();
const likeAgain = page.locator(".detail-social button").first();
const count = await likeAgain.locator("b").innerText();
await likeAgain.click();
await expect(page.getByRole("alert")).toContainText("No se pudo guardar");
await expect(likeAgain.locator("b")).toHaveText(count);
await scene(page, "normal");
await expect(page.locator(".detail-hero h1")).toBeVisible();
// Remix, tag and author links keep their destinations.
await scene(page, "remix");
await expect(page.locator(".detail-parent a")).toBeVisible();
await page.locator(".detail-parent a").click();
await expect(page).toHaveURL(/example=explore-/);
await expect(page.locator(".detail-hero h1")).not.toHaveText(title);
await scene(page, "normal");
await page.locator(".detail-remixes a").first().click();
await expect(page).toHaveURL(/view=build&example=explore-/);
await page.goto(other, { waitUntil: "networkidle" });
await page.locator(".detail-tags a").first().click();
await expect(page).toHaveURL(/view=explore.*tag=/);
await page.goto(other, { waitUntil: "networkidle" });
await page.locator(".detail-byline a").click();
await expect(page.locator(".public-profile-heading h1")).toHaveText("caliza");
await page.goto(other, { waitUntil: "networkidle" });
await page.locator(".detail-crumbs button").click();
await expect(page).toHaveURL(/view=explore/);
// Signed out: every action asks to sign in, nothing changes behind it.
await page.goto(other, { waitUntil: "networkidle" });
await session(page, "out");
await expect(page.locator(".detail-comment-form")).toHaveCount(0);
await page.locator(".detail-social button").first().click();
await expect(page.locator(".access-submit")).toBeVisible();
await page.keyboard.press("Escape");
await session(page, "in");
// Admin: feature toggle, only for public or already featured builds.
await expect(page.locator(".detail-social .is-admin")).toHaveCount(0);
await session(page, "admin");
const feature = page.locator(".detail-social .is-admin");
await expect(feature).toHaveAttribute("aria-pressed", "true");
await feature.click();
await expect(feature).toHaveAttribute("aria-pressed", "false");
await expect(page.locator(".detail-featured")).toHaveCount(0);
await session(page, "in");
// Owner: load with the edit link, restore archives the current version, no report.
await open(page, mine);
await expect(page.locator(".detail-cta a")).toHaveAttribute("href", /&edit=library-0$/);
await expect(page.locator(".detail-social").getByRole("button", { name: "Reportar" })).toHaveCount(0);
const versions = await page.locator(".detail-history li").count();
await page.locator(".detail-history li").first().getByRole("button", { name: "Restaurar", exact: true }).click();
await page.getByRole("button", { name: "Restaurar esta versión", exact: true }).click();
await expect(page.getByRole("status").filter({ hasText: "Versión restaurada" })).toBeVisible();
await expect(page.locator(".detail-history li")).toHaveCount(versions + 1);
await expect(page.locator(".detail-history li b").first()).toHaveText("Antes de restaurar");
// Version links open that version in the workshop.
await expect(page.locator(".detail-history li a").first()).toHaveAttribute("href", /\?b=.+&edit=library-0$/);
// A private build of someone else isn't reachable; a missing one points back to Explore.
await scene(page, "not-found");
await expect(page.locator(".detail-missing")).toContainText("no existe o es privado");
await page.locator(".detail-missing button").click();
await expect(page).toHaveURL(/view=explore/);
// The registry's dialogs are the page's own.
await page.goto(root + "?view=explore&dialog=report-build", { waitUntil: "networkidle" });
await expect(page.locator(".detail-reasons input")).toHaveCount(4);
await page.goto(root + "?view=explore&dialog=restore-version", { waitUntil: "networkidle" });
await expect(page.locator(".detail-restore")).toBeVisible();
results.push({
  id: "flows",
  remixLink: true,
  optimisticLikeSaveRate: true,
  gearPeek: true,
  fullSheet: true,
  commentAppend: true,
  ownCommentNotReportable: true,
  reportAndDuplicate: true,
  failedActionReverted: true,
  remixParentTagAuthorBack: true,
  signedOutGate: true,
  adminFeature: true,
  ownerEditRestore: true,
  versionLinks: true,
  notFound: true,
  registryDialogs: true,
  errors: [...errors],
});
await context.close();
await browser.close();
fs.writeFileSync(report, JSON.stringify(results, null, 2) + "\n");
const failures = results.filter(
  (r) =>
    r.errors?.length ||
    r.violations?.length ||
    r.geometry?.scrollWidth > r.geometry?.width ||
    r.geometry?.clipped ||
    r.geometry?.smallTargets,
);
console.log(JSON.stringify({ checks: results.length, failures }, null, 2));
if (failures.length) process.exitCode = 1;
