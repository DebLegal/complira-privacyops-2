import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-16T12:30:00Z"));
});
test("command search finds actual records on current and different pages; source breadcrumbs", async ({
  page,
}) => {
  await page.goto("/demo/overview");
  await page
    .getByRole("heading", { name: "PrivacyOps overview", exact: true })
    .waitFor();
  await page.keyboard.press("Control+k");
  let search = page.getByRole("dialog", {
    name: "Search pages and records",
    exact: true,
  });
  await expect(search).toBeVisible();
  await search
    .getByLabel("Search pages and actual records")
    .fill("InsightBeacon");
  await search.getByRole("button", { name: /VEN-003/ }).click();
  await expect(page).toHaveURL(/\/demo\/vendors\?record=VEN-003/);
  let detail = page.getByRole("dialog");
  await expect(detail).toContainText("InsightBeacon");
  await expect(
    detail.getByRole("navigation", { name: "Source breadcrumbs" }),
  ).toContainText("VEN-003");
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Search pages and records", exact: true })
    .click();
  search = page.getByRole("dialog", {
    name: "Search pages and records",
    exact: true,
  });
  await search.getByLabel("Search pages and actual records").fill("TicketWay");
  await search.getByRole("button", { name: /VEN-002/ }).click();
  detail = page.getByRole("dialog");
  await expect(detail).toContainText("TicketWay");
  await detail
    .getByRole("button", { name: "Review change", exact: true })
    .click();
  await expect(
    detail.getByRole("list", { name: "Change review steps" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
});
test("wizard validates, preserves step data, guards unsaved work and supports editing", async ({
  page,
}) => {
  await page.goto("/demo/changes");
  await page.getByRole("button", { name: "+ New change", exact: true }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Change title").fill("Synthetic wizard review");
  await d.getByRole("button", { name: "Next: Link sources" }).click();
  await d.getByRole("button", { name: "Preview checks", exact: true }).click();
  await expect(
    d.getByRole("alert").filter({ hasText: "Link at least one" }),
  ).toBeVisible();
  await d.getByLabel("Linked processing activity").selectOption("ACT-003");
  await d.getByLabel("Linked vendor", { exact: true }).selectOption("VEN-003");
  await d.getByRole("button", { name: "Preview checks", exact: true }).click();
  await expect(d.locator(".checklist li")).toHaveCount(4);
  await d.getByRole("button", { name: "Back", exact: true }).click();
  await expect(d.getByLabel("Linked vendor", { exact: true })).toHaveValue(
    "VEN-003",
  );
  await d.getByRole("button", { name: "Preview checks", exact: true }).click();
  await d.getByRole("button", { name: "Create change", exact: true }).click();
  const row = page
    .getByRole("row")
    .filter({ hasText: "Synthetic wizard review" });
  await row.getByRole("button", { name: "Edit change" }).click();
  await d.getByLabel("Change title").fill("Unsaved edit");
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("Discard unsaved");
    await dialog.dismiss();
  });
  await page.keyboard.press("Escape");
  await expect(d).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.keyboard.press("Escape");
  await expect(d).not.toBeVisible();
  await expect(row).toContainText("Synthetic wizard review");
});
test("seven screens have no console errors or metadata warning; real access fails closed", async ({
  page,
  request,
}, testInfo) => {
  test.setTimeout(90000); // Seven sequential navigations plus full-page captures at each viewport.
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || m.text().includes("data-scroll-behavior"))
      errors.push(m.text());
  });
  for (const [module, title] of [
    ["overview", "PrivacyOps overview"],
    ["processing", "Processing register"],
    ["vendors", "Vendors & DPAs"],
    ["notices", "Notice versions"],
    ["changes", "Change control"],
    ["findings", "Findings & actions"],
    ["reports", "Reports"],
  ]) {
    const r = await page.goto("/demo/" + module);
    expect(r?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(page.locator("body")).toContainText("SYNTHETIC DATA ONLY");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(module + ".png"),
      fullPage: true,
    });
  }
  expect((await request.get("/favicon.svg")).status()).toBe(200);
  await page.goto("/app/overview?org=11111111-1111-4111-8111-111111111111");
  await expect(
    page.getByRole("heading", { name: "Customer workspace unavailable" }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Product analytics");
  for (const path of [
    "/api/live/organizations",
    "/api/live/workspace?organizationId=11111111-1111-4111-8111-111111111111",
    "/api/live/reports?organizationId=11111111-1111-4111-8111-111111111111",
  ])
    expect((await request.get(path)).status()).toBe(503);
  expect(
    (
      await request.post("/api/live/mutations", {
        data: {
          organizationId: "forged",
          command: { type: "review", persona: "reviewer" },
        },
      })
    ).status(),
  ).toBe(503);
  expect(
    (await request.post("/api/live/evidence/upload", { data: {} })).status(),
  ).toBe(503);
  expect(errors).toEqual([]);
});
