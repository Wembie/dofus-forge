import { chromium, expect } from "@playwright/test";
import fs from "node:fs";
const browser = await chromium.launch({
  headless: true,
  args: [
    "--enable-webgl",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const results = [];
for (const [device, width, height] of [
  ["desktop", 1440, 900],
  ["mobile", 390, 844],
]) {
  const context = await browser.newContext({
      viewport: { width, height },
      acceptDownloads: true,
    }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4404/", { waitUntil: "networkidle" });
  const metric = page.locator(".stats-panel .metric strong"),
    baseline = await metric.allTextContents();
  async function catalog() {
    await page.getByRole("button", { name: /^Sombrero:/ }).click();
    await page
      .getByRole("button", { name: "Cambiar objeto", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Elegir sombrero" }),
    ).toBeVisible();
  }
  await catalog();
  await page
    .getByRole("textbox", { name: "Buscar objetos", exact: true })
    .fill("no-existe-este-objeto");
  await expect(
    page.getByRole("heading", { name: "No hay coincidencias" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Restablecer filtros" }).click();
  await page
    .getByRole("textbox", { name: "Buscar objetos", exact: true })
    .fill("Sombrero Soifam");
  await page.locator(".catalog-result-open").first().click();
  await expect(page.locator(".catalog-item-heading h3")).toHaveText(
    "Sombrero Soifam",
  );
  const detailGeometry = await page
    .locator(".catalog-inspection")
    .evaluate((e) => ({ width: e.clientWidth, scrollWidth: e.scrollWidth }));
  await page.screenshot({
    path: `docs/design-v0.4/catalog-detail-${device}.png`,
  });
  await page
    .getByRole("button", { name: "Equipar en sombrero", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /^Sombrero:/ }),
  ).toHaveAttribute("title", "Sombrero Soifam");
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  await expect.poll(() => metric.allTextContents()).toEqual(baseline);
  await catalog();
  await page
    .getByRole("textbox", { name: "Buscar objetos", exact: true })
    .fill("Sombrero del conde");
  await page.locator(".catalog-result-open").first().click();
  await page.locator(".catalog-set-link").click();
  await expect(page.getByRole("dialog")).toHaveCount(2);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: /^Sombrero:/ }).click();
  await page.getByRole("button", { name: "Editar runas", exact: true }).click();
  const runeInput = page.getByRole("spinbutton").first();
  await runeInput.fill("25");
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect.poll(() => metric.allTextContents()).not.toEqual(baseline);
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  await expect.poll(() => metric.allTextContents()).toEqual(baseline);
  await page.getByRole("button", { name: /Todas las acciones/ }).click();
  await expect(page.getByRole("option", { name: /Rehacer/ })).toBeVisible();
  await expect(page.getByRole("option", { name: /Publicar build/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("combobox", { name: "Buscar una acción" })
    .fill("Forjadora");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("dialog", { name: "La Forjadora" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Volver al taller", exact: true })
    .click();
  await page.getByRole("button", { name: "Panoplias", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Buscar panoplias", exact: true })
    .fill("volc");
  await page.locator(".catalog-result-open").first().click();
  await expect(page.locator(".set-tiers .is-reached")).toHaveCount(1);
  await page.getByRole("button", { name: /^Equipar \d+ piezas/ }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect.poll(() => metric.allTextContents()).not.toEqual(baseline);
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  await expect.poll(() => metric.allTextContents()).toEqual(baseline);
  await page.getByRole("button", { name: "Panoplias", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Buscar panoplias", exact: true })
    .fill("volc");
  await page.locator(".catalog-result-open").first().click();
  await expect(page.locator(".set-page-link")).toHaveAttribute("href", /sets/);
  const firstPiece = page.locator(".set-pieces-plan li").first();
  await firstPiece.getByRole("button", { name: /^Equipar solo/ }).click();
  await expect(firstPiece).toContainText("Ya equipada");
  await firstPiece.getByRole("button", { name: /^Quitar/ }).click();
  await expect(firstPiece).not.toContainText("Ya equipada");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  await expect.poll(() => metric.allTextContents()).toEqual(baseline);
  await page
    .getByRole("button", { name: "Bonificaciones de panoplia", exact: true })
    .click();
  await page.getByRole("button", { name: "Ver la panoplia" }).first().click();
  await expect(page.getByRole("dialog")).toHaveCount(2);
  await expect(page.locator(".set-heading h3")).not.toBeEmpty();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Distribuir características", exact: true })
    .click();
  const points = page.locator(".chars-budget strong"),
    field = (name) =>
      page.getByRole("textbox", { name: "Puntos en " + name, exact: true }),
    set = async (name, value) => {
      await field(name).fill(String(value));
      await field(name).blur();
    };
  await expect(points).toHaveText("0");
  await set("Fuerza", 100);
  await expect(points).toHaveText("500");
  await page
    .getByRole("button", { name: "Asignar el máximo posible a Agilidad" })
    .click();
  await expect(points).toHaveText("2");
  await expect(field("Agilidad")).toHaveValue("266");
  await set("Agilidad", 0);
  await set("Fuerza", 300);
  await expect(points).toHaveText("0");
  await set("Fuerza", 100);
  const agility = field("Agilidad"),
    plus = page.getByRole("button", { name: "Añadir puntos a Agilidad" });
  await plus.click({ modifiers: ["Shift"] });
  await expect(agility).toHaveValue("5");
  await plus.click();
  await expect(agility).toHaveValue("6");
  const box = await plus.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1200);
  await page.mouse.up();
  const held = Number(await agility.inputValue());
  if (held < 15) throw new Error("holding + added only " + (held - 6));
  await set("Agilidad", 0);
  await set("Fuerza", 300);
  const luck = page
    .getByRole("group", { name: "Suerte" })
    .locator(".chars-total strong"),
    withScroll = Number(await luck.textContent());
  const scroll = page.getByRole("button", { name: /^Pergamino de Suerte/ });
  await scroll.click();
  await expect(luck).toHaveText(String(withScroll - 100));
  await scroll.click();
  await page.keyboard.press("Escape");
  await expect.poll(() => metric.allTextContents()).toEqual(baseline);
  await page
    .getByRole("button", { name: "Pasivos de combate", exact: true })
    .click();
  const passiveTotal = page.locator(".passive-total");
  await expect(passiveTotal).toContainText("Ninguno activo");
  await page.getByRole("radio").filter({ hasText: "Fuerza" }).first().click();
  await expect(passiveTotal).toContainText("+400 Fuerza");
  await page.getByRole("slider").first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(passiveTotal).toContainText("Daño final");
  await page.getByRole("button", { name: "Restablecer", exact: true }).click();
  await expect(passiveTotal).toContainText("Ninguno activo");
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Simular un combate", exact: true })
    .click();
  const damage = page
      .locator(".combat-damage tbody tr:not(.combat-group)")
      .nth(1)
      .locator("td")
      .first(),
    earth = page.getByRole("spinbutton", {
      name: "Resistencia porcentual a Tierra",
    });
  await expect(damage).toBeVisible({ timeout: 15000 });
  const open = await damage.textContent();
  for (const element of ["Neutro", "Tierra", "Fuego", "Agua", "Aire"])
    await page
      .getByRole("spinbutton", { name: "Resistencia porcentual a " + element })
      .fill("50");
  await expect(damage).not.toHaveText(open);
  await page.getByRole("button", { name: "Reiniciar", exact: true }).click();
  await expect(damage).toHaveText(open);
  await expect(earth).toHaveValue("0");
  const row = page.getByRole("row", { name: /^Presión/ }),
    range = (await row.locator("td").first().textContent())
      .split("–")
      .map((n) => Number(n.trim())),
    critical = (await row.locator("td").nth(1).textContent()).match(/\d+/g).map(Number);
  await expect(row.locator("td").nth(1)).toContainText("% de probabilidad");
  for (let i = 0; i < 12; i++) {
    await page.getByRole("button", { name: "Tirar un golpe de Presión" }).click();
    const value = Number(await page.locator(".combat-roll strong").textContent()),
      wasCrit = (await page.locator(".combat-roll small").textContent()).includes(
        "crítico",
      ),
      [lo, hi] = wasCrit ? critical : range;
    if (!(value >= lo && value <= hi))
      throw new Error(`roll ${value} outside ${lo}–${hi}`);
  }
  await page.keyboard.press("Escape");
  const compare = page.getByRole("button", {
      name: "Comparar dos builds",
      exact: true,
    }),
    verdict = page.locator(".cmp-head figcaption");
  await compare.click();
  await expect(verdict).toContainText("son iguales");
  await page.keyboard.press("Escape");
  await catalog();
  await page
    .getByRole("textbox", { name: "Buscar objetos", exact: true })
    .fill("Sombrero Soifam");
  await page.locator(".catalog-result-open").first().click();
  await page
    .getByRole("button", { name: "Equipar en sombrero", exact: true })
    .click();
  await compare.click();
  await expect(verdict).toContainText("1 pieza distinta");
  await expect(page.locator(".cmp-rows li").first()).toBeVisible();
  await page.getByRole("button", { name: "Usar otra build…" }).click();
  await page
    .getByRole("textbox", { name: "Enlace o código de una build" })
    .fill("esto-no-es-una-build");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Comparar", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("No reconocemos");
  await page
    .getByRole("button", { name: "Fijar mi build actual como referencia" })
    .click();
  await expect(verdict).toContainText("son iguales");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /^Guardar/ }).first().click();
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  await expect.poll(() => metric.allTextContents()).toEqual(baseline);
  const code = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.includes("draft"));
    return key ? localStorage.getItem(key) : null;
  });
  await compare.click();
  await page.getByRole("button", { name: "Usar otra build…" }).click();
  await page
    .getByRole("textbox", { name: "Enlace o código de una build" })
    .fill("https://dofusforge.com/es/?b=" + code);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Comparar", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator(".cmp-head strong").first()).toHaveText(
    "Build pegada",
  );
  await expect(verdict).toContainText("1 pieza distinta");
  await expect(page.locator(".cmp-head svg polygon")).not.toHaveCount(0);
  await page.getByRole("button", { name: "Usar otra build…" }).click();
  await expect(
    page.getByRole("region", { name: "Builds de tu cuenta" }),
  ).toContainText("Inicia sesión");
  await page
    .getByRole("textbox", { name: "Enlace o código de una build" })
    .fill("https://dofusforge.com/es/build/00000000-0000-4000-8000-000000000000");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Comparar", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("build publicada");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page
    .getByRole("button", { name: "Copiar enlace de la comparación" })
    .click();
  await expect(
    page.getByRole("button", { name: "Enlace copiado" }),
  ).toBeVisible();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  if (!/[?]b=.+&c=.+/.test(link))
    throw new Error("comparison link lacks both builds: " + link);
  await page.keyboard.press("Escape");
  if (device === "desktop") {
    await page
      .getByRole("button", { name: "Compartir y exportar", exact: true })
      .click();
    const downloadPromise = page.waitForEvent("download", { timeout: 60000 });
    await page
      .getByRole("button", { name: "Descargar ficha", exact: true })
      .click();
    const download = await downloadPromise;
    await download.saveAs("docs/design-v0.4/export-sheet.png");
    await expect(page.getByRole("status")).toContainText("Imagen preparada");
    await page.keyboard.press("Escape");
  }
  results.push({
    device,
    detailGeometry,
    equipAndUndo: true,
    nestedSetDialog: true,
    runeAndUndo: true,
    commandPalette: true,
    setEquipAndUndo: true,
    characteristics: true,
    passives: true,
    combatTable: true,
    holdAndModifiers: true,
    singleSetPiece: true,
    compare: true,
    exported: device === "desktop",
    errors,
  });
  console.log(results.at(-1));
  await context.close();
}
await browser.close();
fs.writeFileSync(
  "docs/design-v0.4/design-flows-check.json",
  JSON.stringify(results, null, 2),
);
if (
  results.some(
    (r) =>
      r.errors.length || r.detailGeometry.scrollWidth > r.detailGeometry.width,
  )
)
  process.exitCode = 1;
