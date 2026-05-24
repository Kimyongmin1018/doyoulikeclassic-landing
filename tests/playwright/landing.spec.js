import { expect, test } from "@playwright/test";

async function expectNoHorizontalOverflow(page) {
  const hasNoOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth <= window.innerWidth + 1;
  });

  expect(hasNoOverflow).toBe(true);
}

async function expectImagesServed(page) {
  const imageSources = await page.locator("img").evaluateAll((nodes) => {
    return nodes.map((node) => node.getAttribute("src")).filter(Boolean);
  });

  expect(imageSources.length).toBeGreaterThanOrEqual(3);

  for (const source of imageSources) {
    const response = await page.request.get(source);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/");
  }
}

test("landing page is readable with loaded imagery and CTA", async ({ page }, testInfo) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /클래식을 좋아하세요/ }).first()).toBeVisible();
  await expect(page.getByText("누적 신청자 500명 이상")).toBeVisible();
  await expect(page.getByRole("link", { name: "이번 기수 신청하기" }).first()).toBeVisible();
  await expect(page.locator("img[alt='클래식 살롱 분위기의 테이블과 악기']")).toBeVisible();
  await page.waitForLoadState("networkidle");
  await expectImagesServed(page);
  await expectNoHorizontalOverflow(page);

  await testInfo.attach("landing-page", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png"
  });
});

test("event, process, faq, and footer sections are reachable", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "일정", exact: true }).click();
  await expect(page.getByRole("heading", { name: "6기 모집" })).toBeVisible();
  await expect(page.getByText("16:00-18:00")).toBeVisible();
  await expect(page.getByText("35,000원").first()).toBeVisible();

  await page.getByRole("link", { name: "지원현황", exact: true }).click();
  await expect(page.getByRole("heading", { name: /지원현황을 확인하고/ })).toBeVisible();
  await expect(page.getByText("남자 17명")).toBeVisible();
  await expect(page.getByText("여자 20명")).toBeVisible();

  await page.getByRole("link", { name: "진행 방식", exact: true }).click();
  await expect(page.getByRole("heading", { name: /신청부터 만남까지/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "처음 신청하는 분들이 자주 묻는 질문" })).toBeVisible();
  await expect(page.getByText("www.doyoulikeclassic.com")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("instagram section presents reel previews", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Instagram", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Instagram에서 먼저 만나는 클래식 살롱" })).toBeVisible();
  await expect(page.getByText("@doyoulike.classic").first()).toBeVisible();
  await expect(page.locator(".reel-card")).toHaveCount(4);
  await expect(page.locator(".reel-card").first()).toHaveAttribute("href", /instagram\.com\/reel/);
  await expectNoHorizontalOverflow(page);
});

test("admin login page renders", async ({ page }) => {
  await page.goto("/admin/login");

  await expect(page.getByRole("heading", { name: "관리자 로그인" })).toBeVisible();
  await expect(page.getByLabel("비밀번호")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
