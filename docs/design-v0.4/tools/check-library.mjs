import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
const output = "docs/design-v0.4/captures/biblioteca",
  report = "docs/design-v0.4/checks/library.json",
  base = "http://127.0.0.1:4404/surfaces.html?view=";
fs.mkdirSync(output, { recursive: true });
const flowOnly = process.argv.includes("--flows"),
  browser = await chromium.launch({
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
          (r) =>
            !r.id.startsWith("flow") &&
            !r.id.startsWith("state-") &&
            !r.id.startsWith("language-"),
        )
      : [];
async function inspect(page, id, device, theme, errors) {
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
  const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze(),
    geometry = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
  if (["desktop", "mobile"].includes(device))
    await page.screenshot({
      path: `${output}/${id}-${device}-${theme}.png`,
      fullPage: !(await page.getByRole("dialog").count()),
    });
  results.push({
    id,
    device,
    theme,
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
async function contextFor(width, height) {
  const context = await browser.newContext({ viewport: { width, height } }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const path of ["**/auth/v1/**", "**/rest/v1/**"])
    await context.route(path, (route) => {
      errors.push("Unexpected account/database request");
      return route.abort();
    });
  return { context, page, errors };
}
async function ready(page) {
  await expect(page.locator(".library-loading")).toHaveCount(0);
}
async function setReview(page, patch) {
  await page.evaluate(async (patch) => {
    const { useLibraryStudy } = await import(
      performance
        .getEntriesByType("resource")
        .find((r) => r.name.includes("/library-model.ts")).name
    );
    useLibraryStudy.getState().review(patch);
  }, patch);
}
for (const [device, width, height] of flowOnly
  ? []
  : [
      ["desktop", 1440, 1000],
      ["laptop", 1366, 900],
      ["tablet", 768, 1024],
      ["mobile", 390, 844],
      ["small-mobile", 360, 800],
    ]) {
  for (const theme of ["tinta", "mineral"]) {
    const { context, page, errors } = await contextFor(width, height);
    await page.goto(base + "my-builds", { waitUntil: "networkidle" });
    if (theme === "mineral")
      await page
        .getByRole("button", { name: "Cambiar tema", exact: true })
        .click();
    await ready(page);
    await expect(page.locator(".library-card")).toHaveCount(4);
    await inspect(page, "mine", device, theme, errors);
    await page
      .getByRole("button", { name: "Vista compacta", exact: true })
      .click();
    await inspect(page, "compact", device, theme, errors);
    await page
      .getByRole("button", { name: "Vista de equipos", exact: true })
      .click();
    await page.locator(".library-tabs button").nth(1).click();
    await ready(page);
    await expect(page.locator(".library-card")).toHaveCount(2);
    await inspect(page, "bookmarked", device, theme, errors);
    await page.locator(".library-tabs button").nth(2).click();
    await ready(page);
    await inspect(page, "collections", device, theme, errors);
    await page.locator(".library-collection-row").first().click();
    await ready(page);
    await expect(page.locator(".library-card")).toHaveCount(4);
    await inspect(page, "collection-owner", device, theme, errors);
    await setReview(page, { visitor: true });
    await expect(page.locator(".library-card")).toHaveCount(2);
    await expect(page.locator(".library-private-note")).toHaveCount(0);
    await inspect(page, "collection-visitor", device, theme, errors);
    await setReview(page, { visitor: false });
    for (const id of [
      "rename",
      "visibility",
      "delete-build",
      "collection-new",
      "collection-edit",
      "collection-picker",
      "collection-delete",
    ]) {
      await page.getByLabel("Abrir diálogo de revisión", { exact: true }).selectOption(id);
      await expect(page.getByRole("dialog")).toBeVisible();
      await inspect(page, id, device, theme, errors);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }
    await context.close();
    console.log(device, theme, "checked");
  }
}
const { context, page, errors } = await contextFor(390, 844);
await page.goto(base + "my-builds", { waitUntil: "networkidle" });
await ready(page);
async function dialog(id) {
  await page.getByLabel("Abrir diálogo de revisión", { exact: true }).selectOption(id);
  await expect(page.getByRole("dialog")).toBeVisible();
}
// Search, visibility, ordering and a card-specific target.
await page.locator(".library-search input").fill("GUARDIA");
await expect(page.locator(".library-card")).toHaveCount(1);
await expect(page.locator(".library-card h2")).toHaveText("Guardia de piedra");
await page.locator(".library-search input").fill("");
await page.locator(".library-filter select").first().selectOption("private");
await expect(page.locator(".library-card h2")).toHaveText("El filo paciente");
await page.locator(".library-filter select").first().selectOption("all");
await page.locator(".library-filter select").last().selectOption("name");
await expect(page.locator(".library-card h2").first()).toHaveText(
  "Distancia justa",
);
await page
  .locator(".library-card")
  .first()
  .getByRole("button", { name: /Acciones de/ })
  .click();
await page.getByRole("button", { name: "Cambiar nombre", exact: true }).click();
await expect(page.locator(".library-dialog-subject b")).toHaveText(
  "Distancia justa",
);
await expect(
  page.getByLabel("Nombre del build", { exact: true }),
).toHaveAttribute("maxlength", "60");
await page
  .getByLabel("Nombre del build", { exact: true })
  .fill("Distancia nueva");
await setReview(page, { response: "error" });
await page
  .getByRole("dialog")
  .getByRole("button", { name: "Guardar", exact: true })
  .click();
await expect(page.getByRole("alert")).toBeVisible();
await expect(page.getByLabel("Nombre del build", { exact: true })).toHaveValue(
  "Distancia nueva",
);
await inspect(page, "state-save-error", "mobile", "tinta", errors);
await page.keyboard.press("Escape");
await expect(page.getByRole("dialog")).toContainText(
  "Tienes cambios pendientes",
);
await page
  .getByRole("button", { name: "Seguir editando", exact: true })
  .click();
await expect(page.getByLabel("Nombre del build", { exact: true })).toHaveValue(
  "Distancia nueva",
);
await setReview(page, { response: "success" });
await page
  .getByRole("dialog")
  .getByRole("button", { name: "Guardar", exact: true })
  .click();
await expect(page.getByRole("dialog")).toHaveCount(0);
await expect(page.locator(".library-card h2").first()).toHaveText(
  "Distancia nueva",
);
await expect(
  page
    .locator(".library-card")
    .first()
    .getByRole("button", { name: /Acciones de/ }),
).toBeFocused();
await dialog("visibility");
await page.getByRole("radio", { name: /Privado/ }).check();
await page
  .getByRole("dialog")
  .getByRole("button", { name: "Guardar", exact: true })
  .click();
await expect(page.getByRole("dialog")).toHaveCount(0);
await expect(
  page.locator(".library-card").first().locator(".library-visibility"),
).toHaveText("Privado");
// Create/edit a collection. Empty trimmed names cannot submit.
await page.locator(".library-tabs button").last().click();
await ready(page);
await page
  .getByRole("button", { name: "Nueva colección", exact: true })
  .click();
await page.getByLabel("Nombre de la colección", { exact: true }).fill("   ");
await expect(
  page.getByRole("dialog").getByRole("button", { name: "Crear", exact: true }),
).toBeDisabled();
await page
  .getByLabel("Nombre de la colección", { exact: true })
  .fill("Ensayo de biblioteca");
await expect(
  page.getByLabel("Descripción (opcional)", { exact: true }),
).toHaveAttribute("maxlength", "300");
await page
  .getByLabel("Descripción (opcional)", { exact: true })
  .fill("Una colección de prueba.");
await page.getByRole("radio", { name: /Pública/ }).check();
await page
  .getByRole("dialog")
  .getByRole("button", { name: "Crear", exact: true })
  .click();
await expect(page.getByRole("dialog")).toHaveCount(0);
await expect(page.locator(".library-collection-row")).toHaveCount(4);
await page.locator(".library-collection-row").first().click();
await ready(page);
await expect(page.locator(".library-heading h1")).toHaveText(
  "Ensayo de biblioteca",
);
await expect(page.locator(".library-empty")).toContainText(
  "todavía no tiene builds",
);
await page
  .locator(".library-heading-actions")
  .getByRole("button", { name: "Editar", exact: true })
  .click();
await page
  .getByLabel("Descripción (opcional)", { exact: true })
  .fill("Edición que se conserva.");
await setReview(page, { response: "error" });
await page
  .getByRole("dialog")
  .getByRole("button", { name: "Guardar", exact: true })
  .click();
await expect(page.getByRole("alert")).toBeVisible();
await expect(
  page.getByLabel("Descripción (opcional)", { exact: true }),
).toHaveValue("Edición que se conserva.");
await setReview(page, { response: "success" });
await page
  .getByRole("dialog")
  .getByRole("button", { name: "Guardar", exact: true })
  .click();
await expect(page.locator(".library-heading")).toContainText(
  "Edición que se conserva.",
);
// Picker rollback and a two-request partial save: retry must not duplicate the collection.
await dialog("collection-picker");
const first = page
  .locator(".library-picker-list li")
  .first()
  .getByRole("button");
await expect(first).toHaveAttribute("aria-pressed", "false");
await setReview(page, { response: "membership-error" });
await first.click();
await expect(page.getByRole("alert")).toBeVisible();
await expect(first).toHaveAttribute("aria-pressed", "false");
await inspect(page, "state-picker-error", "mobile", "tinta", errors);
await page
  .getByRole("button", { name: "Nueva colección", exact: true })
  .click();
await page
  .getByLabel("Nombre de la colección", { exact: true })
  .fill("Colección recuperable");
await page
  .getByRole("dialog")
  .getByRole("button", { name: "Crear", exact: true })
  .click();
await expect(page.getByRole("alert")).toContainText("La colección se creó");
await inspect(page, "state-create-partial", "mobile", "tinta", errors);
await setReview(page, { response: "success" });
await page
  .getByRole("button", { name: "Reintentar añadir", exact: true })
  .click();
await expect(
  page
    .locator(".library-picker-list li")
    .filter({ hasText: "Colección recuperable" }),
).toHaveCount(1);
await expect(
  page
    .locator(".library-picker-list li")
    .filter({ hasText: "Colección recuperable" })
    .getByRole("button"),
).toHaveAttribute("aria-pressed", "true");
await page.getByRole("button", { name: "Listo", exact: true }).click();
// Deleting a collection preserves builds; removing an entry preserves the publication.
await dialog("collection-delete");
await expect(page.getByRole("dialog")).toContainText("Los builds no se borran");
await setReview(page, { response: "forbidden" });
await page
  .getByRole("dialog")
  .getByRole("button", { name: "Eliminar", exact: true })
  .click();
await expect(page.getByRole("alert")).toContainText("no tienes permiso");
await inspect(page, "state-forbidden", "mobile", "tinta", errors);
await setReview(page, { response: "success" });
await page
  .getByRole("dialog")
  .getByRole("button", { name: "Eliminar", exact: true })
  .click();
await expect(page.getByRole("dialog")).toHaveCount(0);
await ready(page);
await expect(page.locator(".library-collection-row")).toHaveCount(4);
await page.locator(".library-tabs button").first().click();
await ready(page);
await expect(page.locator(".library-card")).toHaveCount(4);
await page.locator(".library-tabs button").last().click();
await ready(page);
await page
  .locator(".library-collection-row")
  .filter({ hasText: "Equipos para mazmorras" })
  .click();
await ready(page);
await expect(page.locator(".library-card")).toHaveCount(4);
await page.locator(".library-remove").first().click();
await expect(page.locator(".library-card")).toHaveCount(3);
await expect
  .poll(() => page.locator(".library-remove").first().isEnabled())
  .toBeTruthy();
await page.locator(".library-back").first().click();
await ready(page);
await page.locator(".library-tabs button").first().click();
await ready(page);
await expect(page.locator(".library-card")).toHaveCount(4);
await page.locator(".library-tabs button").nth(1).click();
await ready(page);
await page.locator(".library-card-menu>button").first().click();
await page
  .getByRole("button", { name: "Quitar de Guardadas", exact: true })
  .click();
await expect(page.locator(".library-card")).toHaveCount(1);
await page.locator(".library-tabs button").first().click();
await ready(page);
await page.locator(".library-card-menu>button").first().click();
await page.getByRole("button", { name: "Eliminar", exact: true }).click();
await page
  .getByRole("dialog")
  .getByRole("button", { name: "Eliminar", exact: true })
  .click();
await expect(page.getByRole("dialog")).toHaveCount(0);
await expect(page.locator(".library-card")).toHaveCount(3);
for (const theme of ["tinta", "mineral"]) {
  if (theme === "mineral")
    await page
      .getByRole("button", { name: "Cambiar tema", exact: true })
      .click();
  for (const viewState of ["loading", "error", "empty"]) {
    await setReview(page, { viewState });
    await inspect(page, "state-" + viewState, "mobile", theme, errors);
  }
  await setReview(page, { viewState: "ready" });
  await ready(page);
}
for (const lang of ["en", "fr", "pt", "es"]) {
  const review = page.locator(".library-review");
  if (!(await review.evaluate((e) => e.open)))
    await review.locator("summary").click();
  await review.locator("select").nth(2).selectOption(lang);
  if (lang === "en") {
    await page.locator(".library-search input").fill("iop");
    await expect(page.locator(".library-card")).toHaveCount(1);
    await page.locator(".library-search input").fill("");
  }
  await inspect(page, "language-" + lang, "mobile", "mineral", errors);
}
await page.goto(base + "collection", { waitUntil: "networkidle" });
await ready(page);
await setReview(page, { visitor: true });
await expect(page.locator(".library-card")).toHaveCount(2);
for (const href of await page
  .locator(".library-card footer>a")
  .evaluateAll((links) => links.map((a) => a.getAttribute("href"))))
  expect(href).not.toContain("study-edit");
await page.evaluate(async () => {
  const { useLibraryStudy } = await import(
    performance
      .getEntriesByType("resource")
      .find((r) => r.name.includes("/library-model.ts")).name
  );
  useLibraryStudy.getState().selectCollection("collection-1");
});
await ready(page);
await expect(page.locator(".library-heading h1")).toContainText(
  "Colección no encontrada",
);
await expect(page.locator(".library-study")).not.toContainText(
  "Ideas para PvP",
);
await inspect(page, "state-private-visitor", "mobile", "tinta", errors);
await setReview(page, { visitor: false });
await page.evaluate(async () => {
  const { useLibraryStudy } = await import(
    performance
      .getEntriesByType("resource")
      .find((r) => r.name.includes("/library-model.ts")).name
  );
  useLibraryStudy.getState().selectCollection("collection-2");
});
await ready(page);
await inspect(page, "state-empty-collection", "mobile", "tinta", errors);
await page.goto(base + "my-builds", { waitUntil: "networkidle" });
await ready(page);
await page.locator(".library-search input").fill("sin-coincidencias");
await expect(page.locator(".library-card")).toHaveCount(0);
await inspect(page, "state-no-matches", "mobile", "tinta", errors);
await page.locator(".library-search input").fill("");
await page.evaluate(async () => {
  const { useAccountStudy } = await import(
    performance
      .getEntriesByType("resource")
      .find((r) => r.name.includes("/account-model.ts")).name
  );
  useAccountStudy.getState().setSignedIn(false);
});
await inspect(page, "state-signed-out", "mobile", "tinta", errors);
await dialog("rename");
await expect(page.getByRole("dialog")).toContainText("cuenta propietaria");
await inspect(page, "state-dialog-signed-out", "mobile", "tinta", errors);
await page.keyboard.press("Escape");
// The actual selected example must open, even with another workspace snapshot in sessionStorage.
await page.goto(base + "my-builds", { waitUntil: "networkidle" });
await ready(page);
await page.locator(".library-card-main").nth(2).click();
await expect(page.locator(".detail-hero h1")).toHaveText(
  "Guardia de piedra",
);
await page.goto(base + "my-builds", { waitUntil: "networkidle" });
await ready(page);
const editLink = page.locator(".library-card footer>a").nth(2),
  href = await editLink.getAttribute("href"),
  encoded = new URL(href, "http://127.0.0.1:4404").searchParams.get("b"),
  expected = JSON.parse(Buffer.from(encoded.slice(3), "base64url").toString());
await editLink.click();
await expect(page).toHaveURL(/\?b=/);
await page.waitForFunction(() =>
  performance
    .getEntriesByType("resource")
    .some((r) => r.name.includes("/store/buildStore.ts")),
);
await page.waitForTimeout(500);
const actual = await page.evaluate(async () => {
  const { useBuildStore, ALL_SLOTS } = await import(
    performance
      .getEntriesByType("resource")
      .find((r) => r.name.includes("/store/buildStore.ts")).name
  );
  const b = useBuildStore.getState();
  return {
    c: b.selectedClass,
    n: b.buildName,
    l: b.level,
    g: b.gender === "female" ? "f" : "m",
    e: ALL_SLOTS.map((slot) => b.equipped[slot] || null),
    a: [
      "vitality",
      "wisdom",
      "strength",
      "intelligence",
      "chance",
      "agility",
    ].map((k) => b.allocated[k]),
  };
});
for (const key of ["c", "n", "l", "g", "e", "a"])
  expect(actual[key]).toEqual(expected[key]);
results.push({
  id: "flows",
  search: true,
  visibilityFilter: true,
  sort: true,
  targetedRename: true,
  editRetry: true,
  unsavedGuard: true,
  focusReturn: true,
  visibility: true,
  createCollection: true,
  editCollection: true,
  pickerRollback: true,
  createPartialRetry: true,
  deleteCollectionPreservesBuilds: true,
  removePreservesBuild: true,
  unbookmark: true,
  deleteBuild: true,
  localizedClassSearch: true,
  visitorPrivacy: true,
  selectedDetail: true,
  workshopSnapshot: true,
  errors: [...errors],
});
await context.close();
await browser.close();
fs.writeFileSync(report, JSON.stringify(results, null, 2) + "\n");
const failures = results.filter(
  (r) =>
    r.errors?.length ||
    r.violations?.length ||
    r.geometry?.scrollWidth > r.geometry?.width,
);
console.log(JSON.stringify({ checks: results.length, failures }, null, 2));
if (failures.length) process.exitCode = 1;
