import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
const flowOnly = process.argv.includes("--flows");
const output = "docs/design-v0.4/captures/cuenta";
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
    flowOnly && fs.existsSync("docs/design-v0.4/checks/account.json")
      ? JSON.parse(
          fs.readFileSync("docs/design-v0.4/checks/account.json", "utf8"),
        ).filter(
          (r) =>
            r.id !== "flows" &&
            !r.id.startsWith("idioma-") &&
            !r.id.startsWith("estado-"),
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
          new Promise((resolve) => setTimeout(resolve, 4000)),
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
  fs.writeFileSync(
    "docs/design-v0.4/checks/account.json",
    JSON.stringify(results, null, 2) + "\n",
  );
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
    const context = await browser.newContext({ viewport: { width, height } }),
      page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await context.route("**/auth/v1/**", (route) => {
      errors.push("Unexpected account request");
      return route.abort();
    });
    await context.route("**/rest/v1/**", (route) => {
      errors.push("Unexpected database request");
      return route.abort();
    });
    await page.goto("http://127.0.0.1:4404/surfaces.html?view=account", {
      waitUntil: "networkidle",
    });
    if (theme === "mineral")
      await page
        .getByRole("button", { name: "Cambiar tema", exact: true })
        .click();
    await inspect(page, "perfil", device, theme, errors);
    await page
      .locator(".account-tabs")
      .getByRole("button", { name: "Seguridad", exact: true })
      .click();
    await inspect(page, "seguridad", device, theme, errors);
    await page
      .locator(".account-tabs")
      .getByRole("button", { name: "Sesión", exact: true })
      .click();
    await inspect(page, "sesion", device, theme, errors);
    await page
      .locator(".account-session-row")
      .getByRole("button", { name: "Cerrar sesión", exact: true })
      .click();
    await inspect(page, "cerrar-sesion", device, theme, errors);
    await page.keyboard.press("Escape");
    await page
      .locator(".account-identity nav")
      .getByRole("button", { name: /seguidores/ })
      .click();
    await expect(page.locator(".people-dialog li")).toHaveCount(3);
    await inspect(page, "seguidores", device, theme, errors);
    await page.keyboard.press("Escape");
    await page
      .locator(".account-heading")
      .getByRole("button", { name: "Ver mi perfil público", exact: true })
      .click();
    await inspect(page, "publico-propio", device, theme, errors);
    await expect(page.locator(".account-study")).not.toContainText(
      "player@example.com",
    );
    await page.locator(".profile-review select").selectOption("caliza");
    await inspect(page, "publico-otro", device, theme, errors);
    await expect(page.locator(".public-profile-actions")).not.toContainText(
      "Editar mi perfil",
    );
    await context.close();
    console.log(device, theme, "checked");
  }
}
const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  }),
  page = await context.newPage(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:4404/surfaces.html?view=account", {
  waitUntil: "networkidle",
});
async function scenario(value) {
  const review = page.locator(".account-review");
  if (!(await review.evaluate((e) => e.open)))
    await review.locator("summary").click();
  await review.getByRole("combobox").first().selectOption(value);
}
const name = page.getByLabel("Nombre de usuario", { exact: true }),
  display = page.getByLabel("Nombre (opcional)", { exact: true }),
  bio = page.getByLabel("Biografía", { exact: true });
await expect(name).toHaveAttribute("maxlength", "30");
await expect(display).toHaveAttribute("maxlength", "50");
await expect(bio).toHaveAttribute("maxlength", "300");
await scenario("taken");
await name.fill("brasa_nueva");
await display.fill("Brasa nueva");
await bio.fill("Una biografía que debe conservarse.");
await page.getByRole("button", { name: "Guardar perfil", exact: true }).click();
await expect(page.getByRole("alert")).toContainText("ya está en uso");
await expect(bio).toHaveValue("Una biografía que debe conservarse.");
await scenario("partial");
await page.getByRole("button", { name: "Guardar perfil", exact: true }).click();
await expect(page.getByRole("alert")).toContainText("Tu usuario ya cambió");
await expect(page.locator(".account-identity h2")).toHaveText("brasa_nueva");
await expect(bio).toHaveValue("Una biografía que debe conservarse.");
await page.screenshot({
  path: output + "/guardado-parcial-mobile.png",
  fullPage: true,
});
await scenario("success");
await page.getByRole("button", { name: "Guardar perfil", exact: true }).click();
await expect(page.getByRole("status")).toContainText("Perfil guardado");
await expect(
  page.getByRole("button", { name: "Guardar perfil", exact: true }),
).toBeDisabled();
await bio.fill("Cambio pendiente");
await page
  .locator(".account-heading")
  .getByRole("button", { name: "Ver mi perfil público", exact: true })
  .click();
await expect(page.getByRole("dialog")).toContainText(
  "Tienes cambios pendientes",
);
await page
  .getByRole("button", { name: "Seguir editando", exact: true })
  .click();
await expect(bio).toHaveValue("Cambio pendiente");
await page
  .locator(".account-heading")
  .getByRole("button", { name: "Ver mi perfil público", exact: true })
  .click();
await page
  .getByRole("button", { name: "Salir sin guardar", exact: true })
  .click();
await expect(page.locator(".public-biography")).toHaveText(
  "Una biografía que debe conservarse.",
);
await page
  .getByRole("button", { name: "Editar mi perfil", exact: true })
  .click();
await page
  .locator(".account-tabs")
  .getByRole("button", { name: "Seguridad", exact: true })
  .click();
await page.getByLabel("Nueva contraseña", { exact: true }).fill("secret123");
await page
  .getByLabel("Confirmar contraseña", { exact: true })
  .fill("different123");
await page
  .getByRole("button", { name: "Cambiar contraseña", exact: true })
  .click();
await expect(page.getByRole("alert")).toContainText("no coinciden");
await page
  .getByLabel("Confirmar contraseña", { exact: true })
  .fill("secret123");
await scenario("password-error");
await page
  .getByRole("button", { name: "Cambiar contraseña", exact: true })
  .click();
await expect(page.getByRole("alert")).toBeVisible();
await expect(page.getByLabel("Nueva contraseña", { exact: true })).toHaveValue(
  "secret123",
);
await scenario("success");
await page
  .getByRole("button", { name: "Cambiar contraseña", exact: true })
  .click();
await expect(page.getByRole("status")).toContainText("Contraseña actualizada");
await expect(page.getByLabel("Nueva contraseña", { exact: true })).toHaveValue(
  "",
);
await expect(
  page.getByLabel("Confirmar contraseña", { exact: true }),
).toHaveValue("");
await page
  .locator(".account-identity nav")
  .getByRole("button", { name: /siguiendo/ })
  .click();
await expect(page.locator(".people-dialog li")).toHaveCount(2);
await page.getByRole("searchbox").fill("sin-resultados");
await expect(page.locator(".people-dialog")).toContainText("No hay jugadores");
await page.getByRole("searchbox").fill("caliza");
await page
  .getByRole("dialog")
  .getByRole("button", { name: /caliza/i })
  .click();
await expect(page.locator(".public-profile-heading h1")).toHaveText("caliza");
await scenario("follow-error");
const count = await page
    .locator(".public-social-counts button")
    .first()
    .innerText(),
  follow = page.locator(".public-profile-actions button").first();
const previous = await follow.innerText();
await follow.click();
await expect(page.getByRole("alert")).toContainText("estado anterior");
await expect(follow).toHaveText(previous);
await expect
  .poll(() => page.locator(".public-social-counts button").first().innerText())
  .toEqual(count);
await scenario("success");
await follow.click();
await expect.poll(() => follow.innerText()).not.toEqual(previous);
await page.locator(".profile-review select").selectOption("pedernal");
await expect(page.locator(".account-study")).toContainText("todavía");
await page.locator(".account-tabs button").last().click();
await expect(page.locator(".account-study")).toContainText(
  "no hay colecciones",
);
await page.locator(".profile-review select").selectOption("missing");
await expect(page.locator(".account-study h1")).toHaveText(
  "Perfil no encontrado",
);
await page.getByRole("button", { name: "Mi perfil", exact: true }).click();
await page
  .locator(".account-tabs")
  .getByRole("button", { name: "Sesión", exact: true })
  .click();
await scenario("signout-error");
await page.locator(".account-session-row button").click();
await page
  .getByRole("dialog")
  .getByRole("button", { name: "Cerrar sesión", exact: true })
  .click();
await expect(page.getByRole("alert")).toContainText("Sigues conectado");
await page.keyboard.press("Escape");
await scenario("success");
await page.locator(".account-session-row button").click();
await page
  .getByRole("dialog")
  .getByRole("button", { name: "Cerrar sesión", exact: true })
  .click();
await expect(page.locator(".account-empty")).toContainText(
  "Entra para gestionar",
);
await page
  .locator(".account-empty")
  .getByRole("button", { name: "Iniciar sesión", exact: true })
  .click();
await page.keyboard.press("Escape");
await expect(page.locator(".account-empty")).toBeVisible();
await page
  .locator(".account-empty")
  .getByRole("button", { name: "Iniciar sesión", exact: true })
  .click();
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
  page.getByRole("heading", { name: "Sesión iniciada" }),
).toBeVisible();
await page.getByRole("button", { name: "Volver a mi build" }).click();
await expect(page.locator(".account-identity h2")).toHaveText("brasa_nueva");

await scenario("offline");
await page
  .locator(".account-identity nav")
  .getByRole("button", { name: /seguidores/ })
  .click();
await expect(page.getByRole("alert")).toBeVisible();
await inspect(page, "estado-lista-error", "mobile", "tinta", errors);
await page.keyboard.press("Escape");
await scenario("success");
await page
  .locator(".account-identity nav")
  .getByRole("button", { name: /seguidores/ })
  .click();
await expect(page.locator(".people-dialog li")).toHaveCount(3);
await page.keyboard.press("Escape");
await expect(
  page
    .locator(".account-identity nav")
    .getByRole("button", { name: /seguidores/ }),
).toBeFocused();
const review = page.locator(".account-review");
if (!(await review.evaluate((e) => e.open)))
  await review.locator("summary").click();
await review.getByRole("checkbox").check();
await page
  .locator(".account-identity nav")
  .getByRole("button", { name: /seguidores/ })
  .click();
await expect(page.locator(".people-dialog")).toContainText(
  "Todavía sin seguidores",
);
await inspect(page, "estado-lista-vacia", "mobile", "tinta", errors);
await page.keyboard.press("Escape");
await review.getByRole("checkbox").uncheck();
await page
  .locator(".account-heading")
  .getByRole("button", { name: "Ver mi perfil público", exact: true })
  .click();
await page.locator(".profile-review select").selectOption("pedernal");
await inspect(page, "estado-perfil-vacio", "mobile", "tinta", errors);
await page.locator(".profile-review select").selectOption("missing");
await inspect(page, "estado-perfil-inexistente", "mobile", "tinta", errors);
await page.getByRole("button", { name: "Mi perfil", exact: true }).click();
for (const lang of ["en", "fr", "pt", "es"]) {
  const review = page.locator(".account-review");
  if (!(await review.evaluate((e) => e.open)))
    await review.locator("summary").click();
  await review.locator("select").last().selectOption(lang);
  await inspect(page, "idioma-" + lang, "mobile", "tinta", errors);
}
results.push({
  id: "flows",
  usernameConflict: true,
  partialSave: true,
  pendingEdits: true,
  leaveGuard: true,
  passwordMismatch: true,
  passwordError: true,
  passwordClear: true,
  peopleSearch: true,
  followRollback: true,
  emptyProfile: true,
  missingProfile: true,
  signOutFailure: true,
  signOutAndSignIn: true,
  cancelSignIn: true,
  peopleLoadError: true,
  peopleEmpty: true,
  peopleFocusReturn: true,
  errors: [...errors],
});
await context.close();
await browser.close();
fs.writeFileSync(
  "docs/design-v0.4/checks/account.json",
  JSON.stringify(results, null, 2) + "\n",
);
const failures = results.filter(
  (r) =>
    r.errors?.length ||
    r.violations?.length ||
    r.geometry?.scrollWidth > r.geometry?.width,
);
console.log(JSON.stringify({ checks: results.length, failures }, null, 2));
if (failures.length) process.exitCode = 1;
