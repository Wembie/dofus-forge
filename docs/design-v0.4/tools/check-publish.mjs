import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
expect.configure({ timeout: 10000 });
const root = "http://127.0.0.1:4404",
  surfaces = root + "/surfaces.html?view=explore",
  output = "docs/design-v0.4/captures/publicar",
  report = "docs/design-v0.4/checks/publish.json";
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
    headless: true,
    args: ["--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
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
const dialog = (page) => page.getByRole("dialog");
async function openDialog(page, id) {
  await page.getByLabel("Abrir diálogo de revisión", { exact: true }).selectOption(id);
  await expect(dialog(page).locator(".publish-field input")).toBeVisible();
  await expect(dialog(page).locator(".publish-tags")).not.toContainText("Cargando etiquetas");
}
async function review(page, index, value) {
  const panel = dialog(page).locator(".publish-review");
  if (!(await panel.evaluate((e) => e.open))) await panel.locator("summary").click();
  await panel.locator("select").nth(index).selectOption(value);
}
const link = (page, v) => review(page, 0, v),
  response = (page, v) => review(page, 1, v);
async function inspect(page, id, device, theme, lang, errors) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze(),
    geometry = await page.evaluate(() => {
      const d = document.querySelector("dialog[open]"),
        content = d?.querySelector(".surface-dialog-content");
      return {
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        dialogOverflow: content ? content.scrollWidth - content.clientWidth : 0,
        smallTargets: Array.from(d?.querySelectorAll("button, input, select, a") ?? []).filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width && r.height && r.height < 32 && el.type !== "radio";
        }).length,
      };
    });
  if (["desktop", "mobile"].includes(device))
    await page.screenshot({ path: `${output}/${id}-${device}-${theme}-${lang}.png` });
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
    await page.goto(surfaces, { waitUntil: "networkidle" });
    if (theme === "mineral") await page.getByRole("button", { name: "Cambiar tema", exact: true }).click();
    await openDialog(page, "publish");
    await expect(dialog(page).locator(".publish-field input")).toBeFocused();
    await inspect(page, "new", device, theme, "es", errors);
    await link(page, "update");
    await expect(dialog(page).locator(".publish-field input")).toHaveValue(/.+/);
    await inspect(page, "update", device, theme, "es", errors);
    if (["desktop", "mobile"].includes(device)) {
      await link(page, "remix");
      await expect(dialog(page).locator(".publish-note")).toContainText("remix");
      await inspect(page, "remix", device, theme, "es", errors);
      await link(page, "new");
      for (const name of ["PvP", "PvM", "Koliseo", "Jefes", "Tierra"])
        await dialog(page).getByRole("button", { name, exact: true }).click();
      await expect(dialog(page).getByRole("button", { name: "Fuego", exact: true })).toBeDisabled();
      await inspect(page, "tags-full", device, theme, "es", errors);
      await response(page, "error");
      await dialog(page).getByRole("button", { name: "Publicar", exact: true }).click();
      await expect(dialog(page).getByRole("alert")).toBeVisible();
      await inspect(page, "error", device, theme, "es", errors);
      await response(page, "limit");
      await dialog(page).getByRole("button", { name: "Publicar", exact: true }).click();
      await expect(dialog(page).getByRole("alert")).toContainText("límite de 50");
      await inspect(page, "limit", device, theme, "es", errors);
      await response(page, "tags-error");
      await expect(dialog(page).locator(".publish-inline-error")).toBeVisible();
      await inspect(page, "tags-error", device, theme, "es", errors);
      await response(page, "slow");
      await link(page, "update");
      await expect(dialog(page).locator(".publish-muted[role=status]", { hasText: "Cargando el nombre" })).toBeVisible();
      await inspect(page, "prefill", device, theme, "es", errors);
      await response(page, "normal");
      await page.keyboard.press("Escape");
      // Signed out: the dialog explains and offers sign-in, nothing else.
      await page.locator(".explore-review summary").click();
      await page.locator(".explore-review select").nth(1).selectOption("out");
      await page.getByLabel("Abrir diálogo de revisión", { exact: true }).selectOption("publish");
      await expect(dialog(page).locator(".publish-signin")).toBeVisible();
      await inspect(page, "signed-out", device, theme, "es", errors);
      await page.keyboard.press("Escape");
      await page.locator(".explore-review select").nth(1).selectOption("in");
      for (const lang of ["en", "fr", "pt"]) {
        await page.locator(".explore-review select").nth(2).selectOption(lang);
        await page.getByLabel("Abrir diálogo de revisión", { exact: true }).selectOption("publish");
        await expect(dialog(page).locator(".publish-field input")).toBeVisible();
        await inspect(page, "language", device, theme, lang, errors);
        await page.keyboard.press("Escape");
      }
    }
    await context.close();
    console.log(device, theme, "checked");
  }

// Journeys.
const { context, page, errors } = await create(1440, 1000);
await page.goto(surfaces, { waitUntil: "networkidle" });
// Publishing lands on the new build's page with everything chosen.
await openDialog(page, "publish");
await dialog(page).locator(".publish-field input").fill("Yopuka de prueba");
await expect(dialog(page).locator(".publish-subject b")).toHaveText("Yopuka de prueba");
await dialog(page).getByText("No listado", { exact: true }).click();
await dialog(page).getByRole("button", { name: "PvM", exact: true }).click();
await dialog(page).getByRole("button", { name: "Tierra", exact: true }).click();
await expect(dialog(page).locator(".publish-tags legend small")).toHaveText("2 / 5");
await dialog(page).getByRole("button", { name: "Publicar", exact: true }).click();
await expect(dialog(page).getByRole("button", { name: "Publicando…" })).toBeDisabled();
await expect(page.locator(".detail-hero h1")).toHaveText("Yopuka de prueba");
await expect(page).toHaveURL(/view=build&build=published-/);
await expect(page.locator(".detail-visibility")).toHaveText("No listado");
await expect(page.locator(".detail-tags a")).toHaveText(["PvM", "Tierra"]);
await expect(page.locator(".detail-cta a")).toHaveAttribute("href", /&edit=published-/);
// The workshop is now linked to it: the next publish is an update, prefilled.
await page.getByLabel("Abrir diálogo de revisión", { exact: true }).selectOption("publish");
await expect(dialog(page)).toContainText("Actualizar build");
await expect(dialog(page).locator(".publish-field input")).toHaveValue("Yopuka de prueba");
await expect(dialog(page).getByRole("button", { name: "Tierra", exact: true })).toHaveAttribute("aria-pressed", "true");
await page.keyboard.press("Escape");
await page.getByLabel("Vista del producto", { exact: true }).selectOption("my-builds");
await expect(page.locator(".library-card").first()).toContainText("Yopuka de prueba");
// Update: blocked until the published values arrive, then saves in place.
await page.getByLabel("Vista del producto", { exact: true }).selectOption("explore");
await openDialog(page, "update-build");
await link(page, "update");
await response(page, "slow");
await link(page, "new");
await link(page, "update");
await expect(dialog(page).getByRole("button", { name: "Actualizar", exact: true })).toBeDisabled();
await expect(dialog(page).locator(".publish-field input")).toBeEnabled({ timeout: 5000 });
await response(page, "normal");
await dialog(page).locator(".publish-field input").fill("Yopuka renovado");
await dialog(page).getByRole("button", { name: "Actualizar", exact: true }).click();
await expect(page).toHaveURL(/view=build&build=library-0/);
await expect(page.locator(".detail-hero h1")).toHaveText("Yopuka renovado");
// Someone else's edit link never updates their build: it publishes a remix of it.
await openDialog(page, "publish");
await link(page, "foreign-edit");
await expect(dialog(page)).toContainText("Publicar build");
await expect(dialog(page).locator(".publish-note")).toContainText("pedernal");
// Errors keep what was typed; the limit points to My builds.
await link(page, "new");
await dialog(page).locator(".publish-field input").fill("Se queda");
await response(page, "error");
await dialog(page).getByRole("button", { name: "Publicar", exact: true }).click();
await expect(dialog(page).getByRole("alert")).toContainText("No se pudo publicar");
await expect(dialog(page).locator(".publish-field input")).toHaveValue("Se queda");
await response(page, "limit");
await dialog(page).getByRole("button", { name: "Publicar", exact: true }).click();
await dialog(page).getByRole("button", { name: "Ir a Mis builds" }).click();
await expect(page).toHaveURL(/view=my-builds/);
// From the workshop: header button, publish, and the build page opens with it.
const workshop = await context.newPage();
workshop.on("pageerror", (e) => errors.push(e.message));
await workshop.goto(root + "/", { waitUntil: "networkidle" });
await workshop.locator(".compare-action", { hasText: "Publicar" }).click();
await workshop.getByRole("dialog").locator(".publish-field input").fill("Desde el taller");
await workshop.getByRole("dialog").getByRole("button", { name: "Publicar", exact: true }).click();
await expect(workshop).toHaveURL(/surfaces\.html\?view=build&build=published-/);
await expect(workshop.locator(".detail-hero h1")).toHaveText("Desde el taller");
// A build page link with &edit= opens the workshop linked: its header says Update.
await workshop.goto(root + "/", { waitUntil: "networkidle" });
const href = await (async () => {
  await page.goto(root + "/surfaces.html?view=build&build=library-0", { waitUntil: "networkidle" });
  return page.locator(".detail-cta a").getAttribute("href");
})();
await workshop.goto(root + href, { waitUntil: "networkidle" });
await expect(workshop.locator(".compare-action", { hasText: "Actualizar" })).toBeVisible();
results.push({
  id: "flows",
  publishLandsOnBuild: true,
  linkedAfterPublish: true,
  libraryShowsPublished: true,
  updatePrefillGate: true,
  foreignEditBecomesRemix: true,
  errorKeepsInput: true,
  limitToLibrary: true,
  workshopPublish: true,
  editLinkFromBuildPage: true,
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
    r.geometry?.dialogOverflow > 0 ||
    r.geometry?.smallTargets,
);
console.log(JSON.stringify({ checks: results.length, failures }, null, 2));
if (failures.length) process.exitCode = 1;
