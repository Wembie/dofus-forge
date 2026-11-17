import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
expect.configure({ timeout: 10000 });
const base = "http://127.0.0.1:4404/surfaces.html?view=explore",
  output = "docs/design-v0.4/captures/explorar-experiencia",
  report = "docs/design-v0.4/checks/explore.json",
  flowOnly = process.argv.includes("--flows");
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
  results =
    flowOnly && fs.existsSync(report)
      ? JSON.parse(fs.readFileSync(report, "utf8")).filter(
          (r) => r.id !== "flows",
        )
      : [];
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
async function ready(page) {
  await expect(page.locator(".explore-results")).toHaveAttribute(
    "aria-busy",
    "false",
  );
}
async function review(page, scene) {
  await page.evaluate(() => scrollTo(0, 0));
  const panel = page.locator(".explore-review");
  if (!(await panel.evaluate((e) => e.open)))
    await panel.locator("summary").click();
  await panel.locator("select").first().selectOption(scene);
}
async function filters(page, classId, tag) {
  await page.getByRole("button", { name: /^Filtros/ }).click();
  await page.locator(".explore-filter-dialog select").selectOption(classId);
  await page
    .locator(`.explore-tag-options input[value="${tag}"]`)
    .count()
    .then(async (count) => {
      if (count)
        await page
          .locator(`.explore-tag-options input[value="${tag}"]`)
          .check();
      else if (tag) {
        const names = {
          pvm: "PvM",
          pvp: "PvP",
          earth: "Tierra",
          fire: "Fuego",
        };
        await page
          .getByRole("radio", { name: names[tag], exact: true })
          .check();
      }
    });
  await page
    .getByRole("button", { name: "Mostrar resultados", exact: true })
    .click();
  await ready(page);
}
async function inspect(page, id, device, theme, lang, errors) {
  await page.evaluate(async () => {
    scrollTo(0, 0);
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
  const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze(),
    geometry = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      clippedLabels: Array.from(
        document.querySelectorAll(".build-activity dt"),
      ).filter((el) => el.scrollWidth > el.clientWidth + 1).length,
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
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  });
  errors.length = 0;
  fs.writeFileSync(report, JSON.stringify(results, null, 2) + "\n");
}
for (const [device, width, height] of flowOnly
  ? []
  : [
      ["desktop", 1440, 1000],
      ["laptop", 1366, 900],
      ["tablet", 768, 1024],
      ["mobile", 390, 844],
      ["small-mobile", 360, 800],
    ])
  for (const theme of ["tinta", "mineral"]) {
    const { context, page, errors } = await create(width, height);
    await page.goto(base, { waitUntil: "networkidle" });
    await ready(page);
    if (theme === "mineral")
      await page
        .getByRole("button", { name: "Cambiar tema", exact: true })
        .click();
    await expect(page.locator(".explore-card")).toHaveCount(6);
    await inspect(page, "default", device, theme, "es", errors);
    await page.getByRole("button", { name: "Filtros", exact: true }).click();
    await inspect(page, "filters", device, theme, "es", errors);
    await page.keyboard.press("Escape");
    await expect(page.locator(".explore-filter-trigger")).toBeFocused();
    await filters(page, "feca", "pvm");
    await expect(page.locator(".explore-card")).toHaveCount(3);
    await inspect(page, "filtered", device, theme, "es", errors);
    await page.locator(".explore-clear").click();
    await ready(page);
    if (["desktop", "mobile"].includes(device)) {
      for (const scene of [
        "initial-error",
        "loading",
        "empty",
        "tags-error",
        "stats-error",
        "forge-null",
        "stats-zero",
      ]) {
        await review(page, scene);
        if (scene === "loading")
          await expect(page.locator(".explore-loading")).toBeVisible();
        else await ready(page);
        if (["stats-error", "forge-null", "stats-zero"].includes(scene)) {
          const summary = page.locator(".explore-community-toggle");
          if ((await summary.getAttribute("aria-expanded")) === "false")
            await summary.click();
        }
        await inspect(page, scene, device, theme, "es", errors);
      }
      await review(page, "more-error");
      await ready(page);
      await page
        .getByRole("button", { name: "Cargar más", exact: true })
        .click();
      await expect(page.getByRole("alert")).toBeVisible();
      await expect(page.locator(".explore-card")).toHaveCount(6);
      await inspect(page, "more-error", device, theme, "es", errors);
      await review(page, "normal");
      await ready(page);
      for (const lang of ["en", "fr", "pt"]) {
        await page.locator(".explore-review select").nth(2).selectOption(lang);
        await inspect(page, "language", device, theme, lang, errors);
        await page.locator(".explore-filter-trigger").click();
        await inspect(page, "language-filters", device, theme, lang, errors);
        await page.keyboard.press("Escape");
      }
    }
    await context.close();
    console.log(device, theme, "checked");
  }
const { context, page, errors } = await create(390, 844);
await page.goto(base, { waitUntil: "networkidle" });
await ready(page);
await page.locator(".explore-sort select").selectOption("likes");
await ready(page);
await expect(page.locator(".explore-card h2").first()).toHaveText(
  "Distancia justa · III",
);
await page.locator(".explore-sort select").selectOption("views");
await ready(page);
await expect(page.locator(".explore-card h2").first()).toHaveText(
  "Yopuka · Tierra · III",
);
await page.locator(".explore-sort select").selectOption("recent");
await ready(page);
await expect(page.locator(".explore-card h2").first()).toHaveText(
  "Yopuka · Tierra",
);
await expect(page.locator(".explore-card h2").nth(1)).toHaveText(
  "El filo paciente",
);
await page.getByRole("button", { name: "Filtros", exact: true }).click();
await page.locator(".explore-filter-dialog select").selectOption("cra");
await page.keyboard.press("Escape");
await expect(page.locator(".explore-card")).toHaveCount(6);
await expect(page).not.toHaveURL(/class=/);
await filters(page, "feca", "pvm");
await expect(page.locator(".explore-card")).toHaveCount(3);
await expect(page).toHaveURL(/class=feca/);
await expect(page).toHaveURL(/tag=pvm/);
await expect(page.locator(".explore-sort select")).toHaveValue("recent");
await page
  .getByRole("button", { name: "Quitar filtro de clase", exact: true })
  .click();
await ready(page);
await expect(page.locator(".explore-results-heading")).toContainText("6 de 12");
await page
  .getByRole("button", { name: "Quitar filtro de etiqueta", exact: true })
  .click();
await ready(page);
const search = page.locator(".explore-search input");
await search.fill("Yop & tie");
await ready(page);
await expect(page.locator(".explore-card")).toHaveCount(3);
await expect(page.locator(".explore-card h2")).toHaveText([
  "Yopuka · Tierra",
  "Yopuka · Tierra · II",
  "Yopuka · Tierra · III",
]);
await expect(page).toHaveURL(/q=/);
await search.fill("no-existe-esta-build");
await ready(page);
await expect(page.locator(".explore-empty h2")).toContainText("No encontramos");
await expect(search).toHaveValue("no-existe-esta-build");
await page.locator(".explore-empty button").click();
await ready(page);
await expect(search).toHaveValue("");
// Stable pages, duplicate-click protection and focus on the first appended result.
await page.locator(".explore-sort select").selectOption("rating");
await ready(page);
const initialIds = await page
  .locator(".explore-card")
  .evaluateAll((nodes) => nodes.map((n) => n.dataset.buildId));
await page.getByRole("button", { name: "Cargar más", exact: true }).click();
await expect(page.locator(".explore-more")).toBeDisabled();
await expect(page.locator(".explore-card")).toHaveCount(12);
await expect(page.locator(".explore-card-open").nth(6)).toBeFocused();
await page.getByRole("button", { name: "Cargar más", exact: true }).click();
await expect(page.locator(".explore-card")).toHaveCount(18);
const ids = await page
  .locator(".explore-card")
  .evaluateAll((nodes) => nodes.map((n) => n.dataset.buildId));
expect(new Set(ids).size).toBe(18);
expect(ids.slice(0, 6)).toEqual(initialIds);
expect(ids.some((id) => id.includes("hidden"))).toBe(false);
await expect(page.locator(".explore-more")).toHaveCount(0);
await expect(page.locator(".explore-end")).toBeVisible();
// A failed append retains both the page and its filters, and retries the same slice.
await review(page, "more-error");
await ready(page);
const before = await page
  .locator(".explore-card")
  .evaluateAll((nodes) => nodes.map((n) => n.dataset.buildId));
await page.getByRole("button", { name: "Cargar más", exact: true }).click();
await expect(page.getByRole("alert")).toBeVisible();
expect(
  await page
    .locator(".explore-card")
    .evaluateAll((nodes) => nodes.map((n) => n.dataset.buildId)),
).toEqual(before);
await page
  .getByRole("button", { name: "Reintentar cargar más", exact: true })
  .click();
await expect(page.locator(".explore-card")).toHaveCount(12);
expect(
  new Set(
    await page
      .locator(".explore-card")
      .evaluateAll((nodes) => nodes.map((n) => n.dataset.buildId)),
  ).size,
).toBe(12);
// A slow obsolete request must not overwrite newer filters.
await review(page, "slow");
await search.fill("Yop");
await page.waitForTimeout(390);
await review(page, "normal");
await search.fill("Guard");
await ready(page);
await expect(page.locator(".explore-card h2")).toHaveText([
  "Guardia de piedra",
  "Guardia de piedra · II",
  "Guardia de piedra · III",
]);
await page.waitForTimeout(1200);
await expect(page.locator(".explore-card")).toHaveCount(3);
await expect(page.locator(".explore-card h2").first()).toHaveText(
  "Guardia de piedra",
);
await review(page, "initial-error");
await ready(page);
await expect(page.locator(".explore-empty h2")).toContainText("No pudimos");
await expect(search).toHaveValue("Guard");
await page.locator(".explore-empty button").click();
await ready(page);
await expect(page.locator(".explore-card")).toHaveCount(3);
// Context and identity survive opening an author or a specific build.
await page.locator(".explore-card").first().scrollIntoViewIfNeeded();
const selected = await page.locator(".explore-card h2").first().innerText();
await page.locator(".explore-card-open").first().click();
await expect(page.locator(".detail-hero h1")).toHaveText(selected);
const detailUrl = page.url();
await page
  .getByLabel("Vista del producto", { exact: true })
  .selectOption("explore");
await ready(page);
await expect(search).toHaveValue("Guard");
await expect(page.locator(".explore-card")).toHaveCount(3);
await page.locator(".explore-card-author a").first().click();
await expect(page.locator(".public-profile-heading h1")).toHaveText("pedernal");
await page
  .getByLabel("Vista del producto", { exact: true })
  .selectOption("explore");
await ready(page);
await expect(search).toHaveValue("Guard");
// Saving while signed out resumes the selected build after local sign-in; cancelling stays in context.
await page.evaluate(() => scrollTo(0, 0));
const reviewPanel = page.locator(".explore-review");
if (!(await reviewPanel.evaluate((e) => e.open)))
  await reviewPanel.locator("summary").click();
await reviewPanel.locator("select").nth(1).selectOption("out");
await page.locator(".explore-save").first().click();
await expect(page.locator(".access-submit")).toBeVisible();
await page.keyboard.press("Escape");
await expect(search).toHaveValue("Guard");
await page.locator(".explore-save").first().click();
await page
  .getByRole("dialog")
  .getByLabel("Correo", { exact: true })
  .fill("player@example.com");
await page
  .getByRole("dialog")
  .getByLabel("Contraseña", { exact: true })
  .fill("secret123");
await page.locator(".access-submit").click();
await expect(
  page.getByRole("heading", { name: "Sesión iniciada", exact: true }),
).toBeVisible();
await page
  .getByRole("button", { name: "Volver a mi build", exact: true })
  .click();
await expect(page.locator(".library-dialog-subject b")).toHaveText(selected);
const membership = page
  .locator(".library-picker-list li")
  .first()
  .getByRole("button");
await expect(membership).toHaveAttribute("aria-pressed", "false");
await membership.click();
await expect(membership).toBeEnabled();
await expect(membership).toHaveAttribute("aria-pressed", "true");
await page.getByRole("button", { name: "Listo", exact: true }).click();
await expect(search).toHaveValue("Guard");
await page
  .getByLabel("Vista del producto", { exact: true })
  .selectOption("my-builds");
await expect(page.locator(".library-card")).toHaveCount(4);
await page
  .getByLabel("Vista del producto", { exact: true })
  .selectOption("explore");
await ready(page);
await review(page, "tags-error");
await ready(page);
await page.locator(".explore-filter-trigger").click();
await expect(page.locator(".explore-filter-dialog")).toContainText(
  "No pudimos cargar las etiquetas",
);
await page
  .getByRole("dialog")
  .getByRole("button", { name: "Reintentar", exact: true })
  .click();
await expect(page.locator(".explore-tag-options")).toBeVisible();
await page.keyboard.press("Escape");
await review(page, "stats-error");
await ready(page);
await expect(page.locator(".explore-card")).toHaveCount(3);
const summary = page.locator(".explore-community-toggle");
if ((await summary.getAttribute("aria-expanded")) === "false")
  await summary.click();
await page.locator(".explore-community-state button").click();
await expect(page.locator(".explore-community dd")).toHaveCount(8);
await review(page, "forge-null");
await ready(page);
await expect(page.locator(".explore-community dd")).toHaveCount(6);
await review(page, "stats-zero");
await ready(page);
await expect(page.locator(".explore-community dd")).toHaveText(
  Array(8).fill("0"),
);
// Public deep links work without an example session and preserve all query dimensions.
await page.goto(base + "&tag=pvm&class=iop&q=Yop%20tie&sort=views", {
  waitUntil: "networkidle",
});
await ready(page);
await expect(page.locator(".explore-card")).toHaveCount(3);
await expect(page.locator(".explore-card h2").first()).toHaveText(
  "Yopuka · Tierra · III",
);
await expect(page.locator(".explore-active-filters button")).toHaveCount(4);
await page.goto(base + "&tag=etiqueta-desconocida", {
  waitUntil: "networkidle",
});
await ready(page);
await expect(page.locator(".explore-inline-notice")).toContainText(
  "no está disponible",
);
await expect(page.locator(".explore-card")).toHaveCount(6);
await page
  .getByRole("button", { name: "Quitar filtro de etiqueta", exact: true })
  .click();
await ready(page);
await expect(page).not.toHaveURL(/tag=/);
await page.goto(detailUrl, { waitUntil: "networkidle" });
await expect(page.locator(".detail-hero h1")).toHaveText(selected);
await page.goto(
  "http://127.0.0.1:4404/surfaces.html?view=profile&player=caliza",
  { waitUntil: "networkidle" },
);
await expect(page.locator(".public-profile-heading h1")).toHaveText("caliza");
results.push({
  id: "flows",
  fourSorts: true,
  classAndTagIntersection: true,
  draftCancel: true,
  removableFilters: true,
  prefixSearch: true,
  paginationStable: true,
  appendFocus: true,
  appendRetry: true,
  staleResponsesIgnored: true,
  initialRetry: true,
  authorAndBuildIdentity: true,
  contextPreserved: true,
  signInResume: true,
  cancelSignIn: true,
  collectionTarget: true,
  privateBuildsExcluded: true,
  metadataRetry: true,
  nullableForgeStats: true,
  zeroStats: true,
  queryDeepLink: true,
  unknownTag: true,
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
    r.geometry?.clippedLabels,
);
console.log(JSON.stringify({ checks: results.length, failures }, null, 2));
if (failures.length) process.exitCode = 1;
