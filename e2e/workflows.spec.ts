import { test, expect, type Page } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-16T12:30:00.000Z"));
});
async function go(page: Page, route: string) {
  await page.getByRole("link", { name: route, exact: true }).click();
  await expect(
    page.getByRole("heading", { name: route, exact: true }),
  ).toBeVisible();
}
const dialog = (page: Page) => page.getByRole("dialog");
test("seven routes, record CRUD, links, archives, persistence and reset", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/demo");
  await expect(page).toHaveURL(/\/demo\/overview$/);
  await expect(page.locator(".metric .value")).toHaveText(["4", "4", "4", "3"]);
  await expect(page.getByRole("navigation").getByRole("link")).toHaveCount(7);
  await go(page, "Processing register");
  await page
    .getByRole("button", { name: "+ Add activity", exact: true })
    .click();
  await dialog(page).getByLabel("Activity name").fill("Trial signup");
  await dialog(page)
    .getByLabel("Purpose", { exact: true })
    .fill("Evaluation account registration");
  await dialog(page).getByLabel("Data categories").fill("Business email");
  await dialog(page).getByLabel("Source system").fill("Web application");
  await dialog(page).getByLabel("Responsible owner").fill("Product");
  await dialog(page)
    .getByRole("checkbox", { name: /VEN-003/ })
    .check();
  await dialog(page).getByRole("button", { name: "Save activity" }).click();
  const row = page.getByRole("row").filter({ hasText: "Trial signup" });
  await expect(row).toContainText("ACT-005");
  await expect(row).toContainText("VEN-003");
  await row.getByRole("button", { name: "Edit", exact: true }).click();
  await dialog(page).getByLabel("Activity name").fill("Trial signup edited");
  await dialog(page).getByRole("button", { name: "Save activity" }).click();
  await row.getByRole("button", { name: "Archive", exact: true }).click();
  await expect(row).toContainText("Archived");
  await row.getByRole("button", { name: "Restore", exact: true }).click();
  await page.getByLabel("Search records").fill("Trial signup edited");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.reload();
  await expect(
    page.getByRole("row").filter({ hasText: "Trial signup edited" }),
  ).toBeVisible();
  await go(page, "Vendors & DPAs");
  await expect(
    page.getByRole("row").filter({ hasText: "InsightBeacon" }),
  ).toContainText("ACT-005");
  await page.getByRole("button", { name: "+ Add vendor", exact: true }).click();
  await dialog(page).getByLabel("Vendor name").fill("Synthetic Test Vendor");
  await dialog(page).getByLabel("Responsible owner").fill("Product");
  await dialog(page)
    .getByRole("checkbox", { name: /ACT-005/ })
    .check();
  await dialog(page)
    .getByLabel("Synthetic contract evidence references")
    .fill("SYNTH-DPA-v1");
  await dialog(page).getByRole("button", { name: "Save vendor" }).click();
  const vr = page.getByRole("row").filter({ hasText: "Synthetic Test Vendor" });
  await expect(vr).toContainText("VEN-005");
  await vr.getByRole("button", { name: "Edit", exact: true }).click();
  await dialog(page)
    .getByLabel("Provisional role")
    .selectOption("Processor (provisional)");
  await dialog(page).getByRole("button", { name: "Save vendor" }).click();
  await vr.getByRole("button", { name: "Archive", exact: true }).click();
  await expect(vr).toContainText("Archived");
  await vr.getByRole("button", { name: "Restore", exact: true }).click();
  await go(page, "PrivacyOps overview");
  await expect(page.locator(".metric .value")).toHaveText(["5", "5", "4", "3"]);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await expect(page.locator(".metric .value")).toHaveText(["4", "4", "4", "3"]);
  await page.reload();
  await expect(page.locator(".metric .value")).toHaveText(["4", "4", "4", "3"]);
  await expect(page.locator("body")).toContainText("SYNTHETIC DATA ONLY");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("overview.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("analytics checks, deduplication, evidence closure, notice version and exports", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/demo/changes");
  await page.getByRole("button", { name: "+ New change", exact: true }).click();
  await dialog(page).getByLabel("Change title").fill("Add analytics processor");
  await dialog(page)
    .getByRole("button", { name: "Next: Link sources" })
    .click();
  await dialog(page)
    .getByLabel("Linked processing activity")
    .selectOption("ACT-003");
  await dialog(page)
    .getByLabel("Linked vendor", { exact: true })
    .selectOption("VEN-003");
  await dialog(page)
    .getByRole("button", { name: "Preview checks", exact: true })
    .click();
  await dialog(page)
    .getByRole("button", { name: "Create change", exact: true })
    .click();
  const change = page
    .getByRole("row")
    .filter({ hasText: "Add analytics processor" });
  await change.getByRole("button", { name: "Review checks" }).click();
  await expect(dialog(page).locator(".checklist li")).toHaveCount(4);
  for (const rule of [
    "NOTICE_PURPOSE_MISMATCH",
    "VENDOR_CONTRACT_EVIDENCE_MISSING",
    "RETENTION_RULE_UNDEFINED",
    "VENDOR_ROLE_UNDETERMINED",
  ])
    await expect(dialog(page)).toContainText(rule);
  await dialog(page)
    .getByRole("button", { name: "Record review request" })
    .click();
  await change.getByRole("button", { name: "Review checks" }).click();
  await dialog(page)
    .getByRole("button", { name: "Record review request" })
    .click();
  await go(page, "PrivacyOps overview");
  await expect(page.locator(".metric .value")).toHaveText(["4", "4", "8", "7"]);
  await go(page, "Findings & actions");
  const finding = page.getByRole("row").filter({ hasText: "FND-003" });
  await finding.getByRole("button", { name: "Review", exact: true }).click();
  await dialog(page).getByRole("button", { name: "Request closure" }).click();
  await dialog(page)
    .getByLabel("How the action was addressed")
    .fill("Synthetic retention schedule metadata added");
  await dialog(page)
    .getByRole("button", { name: "Submit to reviewer" })
    .click();
  await expect(finding).toContainText("pending closure");
  await finding.getByRole("button", { name: "Review", exact: true }).click();
  await expect(
    dialog(page).getByRole("button", { name: "Review closure" }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.getByLabel("Demo persona").selectOption("reviewer");
  await finding.getByRole("button", { name: "Review", exact: true }).click();
  await dialog(page).getByRole("button", { name: "Review closure" }).click();
  await dialog(page)
    .getByLabel("Reviewer rationale")
    .fill("Reviewed synthetic metadata only");
  await dialog(page).getByRole("button", { name: "Record decision" }).click();
  await expect(finding).toContainText("closed");
  await go(page, "Notice versions");
  await page.getByRole("button", { name: "+ Create draft" }).click();
  await dialog(page)
    .getByRole("checkbox", { name: /ACT-003/ })
    .check();
  await dialog(page).getByRole("button", { name: "Save draft" }).click();
  const notice = page.getByRole("row").filter({ hasText: "v3.0" });
  await notice.getByRole("button", { name: "Compare" }).click();
  await expect(dialog(page)).toContainText("Added: ACT-003");
  await page.keyboard.press("Escape");
  await notice.getByRole("button", { name: "Submit review" }).click();
  await notice.getByRole("button", { name: "Review", exact: true }).click();
  await dialog(page)
    .getByLabel("Reviewer rationale")
    .fill("Reviewed synthetic purpose map only");
  await dialog(page).getByRole("button", { name: "Record decision" }).click();
  await expect(notice).toContainText("current recorded");
  await expect(page.getByRole("row").filter({ hasText: "v2.0" })).toContainText(
    "archived",
  );
  await go(page, "Reports");
  const jsonWait = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  const json = await jsonWait;
  const path = await json.path();
  const fs = await import("node:fs/promises");
  const report = JSON.parse(await fs.readFile(path!, "utf8"));
  expect(report.schemaVersion).toBe("complira.export.v1");
  expect(report.workspace.findings).toHaveLength(8);
  expect(report.workspace.review_decisions).toHaveLength(2);
  const csvWait = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const csv = await csvWait;
  expect(await fs.readFile((await csv.path())!, "utf8")).toContain(
    "Reviewed synthetic metadata only",
  );
  await page.evaluate(() => {
    window.print = () => {
      document.body.dataset.printed = "true";
    };
  });
  await page.getByRole("button", { name: "Print / PDF" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-printed", "true");
  expect(errors).toEqual([]);
});
test("dialog keyboard focus, mobile navigation, unknown routes denied", async ({
  page,
}) => {
  await page.goto("/demo/processing");
  await page
    .getByRole("button", { name: "+ Add activity", exact: true })
    .click();
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() =>
      document.querySelector("dialog[open]")?.contains(document.activeElement),
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog(page)).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "+ Add activity", exact: true }),
  ).toBeFocused();
  for (const label of [
    "Vendors & DPAs",
    "Notice versions",
    "Change control",
    "Findings & actions",
    "Reports",
    "PrivacyOps overview",
  ])
    await go(page, label);
  await expect(
    page.getByRole("heading", { name: "PrivacyOps overview", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/app");
  await expect(
    page.getByRole("heading", { name: "Customer workspace unavailable" }),
  ).toBeVisible();
  await page.goto("/demo/assessment");
  await expect(page.getByText("This page could not be found.")).toBeVisible();
});

test("assignments, actions, closure rejection and reopening retain reviewer history", async ({
  page,
}) => {
  await page.goto("/demo/findings");
  const row = page.getByRole("row").filter({ hasText: "FND-003" });
  await row.getByRole("button", { name: "Review", exact: true }).click();
  await dialog(page)
    .getByRole("button", { name: "Assign / set due date" })
    .click();
  await dialog(page)
    .getByLabel("Responsible owner")
    .fill("Synthetic Operations");
  await dialog(page).getByLabel("Due date").fill("2026-12-01");
  await dialog(page).getByRole("button", { name: "Save assignment" }).click();
  await expect(row).toContainText("Synthetic Operations / 2026-12-01");
  const task = page.locator(".queue-item").filter({ hasText: "TASK-003" });
  await task.getByRole("button", { name: "Edit action" }).click();
  await dialog(page)
    .getByLabel("Responsible owner")
    .fill("Synthetic Operations");
  await dialog(page).getByLabel("Status").selectOption("blocked");
  await dialog(page).getByRole("button", { name: "Save action" }).click();
  await expect(task).toContainText("blocked");
  await row.getByRole("button", { name: "Review", exact: true }).click();
  await dialog(page).getByRole("button", { name: "Request closure" }).click();
  await dialog(page)
    .getByLabel("How the action was addressed")
    .fill("Synthetic supporting metadata added");
  await dialog(page)
    .getByRole("button", { name: "Submit to reviewer" })
    .click();
  await page.getByLabel("Demo persona").selectOption("reviewer");
  await row.getByRole("button", { name: "Review", exact: true }).click();
  await dialog(page).getByRole("button", { name: "Review closure" }).click();
  await dialog(page).getByLabel("Decision").selectOption("reject");
  await dialog(page)
    .getByLabel("Reviewer rationale")
    .fill("Need more synthetic metadata");
  await dialog(page).getByRole("button", { name: "Record decision" }).click();
  await expect(row).toContainText("open action");
  await page.getByLabel("Demo persona").selectOption("editor");
  await row.getByRole("button", { name: "Review", exact: true }).click();
  await expect(dialog(page)).toContainText("Need more synthetic metadata");
  await dialog(page).getByRole("button", { name: "Request closure" }).click();
  await dialog(page)
    .getByLabel("How the action was addressed")
    .fill("Updated synthetic supporting metadata");
  await dialog(page)
    .getByRole("button", { name: "Submit to reviewer" })
    .click();
  await page.getByLabel("Demo persona").selectOption("reviewer");
  await row.getByRole("button", { name: "Review", exact: true }).click();
  await dialog(page).getByRole("button", { name: "Review closure" }).click();
  await dialog(page)
    .getByLabel("Reviewer rationale")
    .fill("Reviewed updated synthetic evidence");
  await dialog(page).getByRole("button", { name: "Record decision" }).click();
  await row.getByRole("button", { name: "Review", exact: true }).click();
  await dialog(page)
    .getByRole("button", { name: "Reopen", exact: true })
    .click();
  await dialog(page)
    .getByLabel("Reviewer rationale")
    .fill("New synthetic change needs review");
  await dialog(page).getByRole("button", { name: "Record decision" }).click();
  await expect(row).toContainText("open action");
  await row.getByRole("button", { name: "Review", exact: true }).click();
  await expect(dialog(page)).toContainText("Need more synthetic metadata");
  await expect(dialog(page)).toContainText(
    "Reviewed updated synthetic evidence",
  );
  await expect(dialog(page)).toContainText("New synthetic change needs review");
});
