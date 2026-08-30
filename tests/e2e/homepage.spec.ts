import { expect, test, type Page } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page, width: number) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

async function expectPageImagesLoaded(page: Page) {
  const images = await page.locator("img").evaluateAll((elements) =>
    elements.map((image) => {
      const element = image as HTMLImageElement;
      return {
        alt: element.alt,
        complete: element.complete,
        naturalHeight: element.naturalHeight,
        naturalWidth: element.naturalWidth,
      };
    }),
  );

  expect(images.length).toBeGreaterThanOrEqual(5);
  for (const image of images) {
    expect(image.alt).not.toBe("");
    expect(image.complete, `${image.alt} should finish loading`).toBe(true);
    expect(image.naturalWidth, `${image.alt} should have a rendered width`).toBeGreaterThan(0);
    expect(image.naturalHeight, `${image.alt} should have a rendered height`).toBeGreaterThan(0);
  }
}

test("renders the concise visual portfolio identity", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Eunwha Park | Backend & Distributed Systems Engineer");
  await expect(page.getByRole("heading", { name: "Eunwha Park", exact: true })).toBeVisible();
  await expect(page.getByText("I build reliable backend systems and practical AI retrieval tools.", { exact: true })).toBeVisible();
  const terminal = page.getByLabel("Mac-style terminal showing engineering focus", { exact: true });
  await expect(terminal).toBeVisible();
  await expect(terminal.locator(".hero-panel-dot")).toHaveCount(3);
  await expect(terminal.getByText("current-focus.txt", { exact: true })).toBeVisible();
  await expect(page.locator("#home .hero-skill-orbit")).toHaveCount(0);
});

test("removes location and recruiter metric tiles", async ({ page }) => {
  await page.goto("/");

  const home = page.locator("#home");
  await expect(home.getByText(/Urbana, IL|UIUC MCS 2026\s*-\s*2028/i)).toHaveCount(0);
  await expect(page.getByText(/Records Migrated|Annual Cost Reduction|Monthly SLO|9 Merged OSS PRs/i)).toHaveCount(0);
  await expect(page.locator(".stats, .stat-item")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("78B+");
  await expect(page.locator("body")).not.toContainText("$2.2M");
  await expect(page.locator("body")).not.toContainText("99.5%+");
});

test("presents the role and AWS certification as matching visual tags", async ({ page }) => {
  await page.goto("/");

  const tags = page.locator("#home .identity-tag");
  await expect(tags).toHaveCount(2);
  await expect(tags.nth(0)).toHaveText(/Backend & Distributed Systems Engineer/);
  await expect(tags.nth(1)).toHaveText(/AWS Certified Solutions Architect - Professional/);
  await expect(page.locator("#skills .identity-tag")).toHaveCount(0);

  const styles = await tags.evaluateAll((elements) =>
    elements.map((element) => ({
      borderRadius: getComputedStyle(element).borderRadius,
      display: getComputedStyle(element).display,
    })),
  );
  expect(styles[0]).toEqual(styles[1]);
  expect(parseFloat(styles[0].borderRadius)).toBeGreaterThan(20);
});

test("shows compact Samsung roles with a logo and one-line current role summary", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/#experience");

  const experience = page.locator("#experience");
  await expect(experience.getByAltText("Samsung", { exact: true })).toBeVisible();
  await expect(experience.getByRole("heading", { name: "Backend Software Engineer", exact: true })).toBeVisible();
  await expect(experience.getByRole("heading", { name: "Software Engineer Intern", exact: true })).toBeVisible();
  await expect(experience.getByText("Jan 2023 — Present", { exact: true })).toBeVisible();
  await expect(experience.getByText("Mar 2022 — Jun 2022", { exact: true })).toBeVisible();
  const summary = experience.getByText("Backend systems across identity, migration, reliability, and cloud platforms.", { exact: true });
  await expect(summary).toBeVisible();
  const summaryBox = await summary.boundingBox();
  expect(summaryBox?.height).toBeLessThan(30);
  await expect(experience.locator(".role-row")).toHaveCount(2);
});

test("shows both schools with visual identity and concise degree details", async ({ page }) => {
  await page.goto("/#education");

  const education = page.locator("#education");
  await expect(education.locator(".education-card")).toHaveCount(2);
  await expect(education.getByAltText("University of Illinois Block I logo", { exact: true })).toBeVisible();
  await expect(education.getByAltText("Kyungpook National University logo", { exact: true })).toBeVisible();
  await expect(education.getByText("Master of Computer Science", { exact: true })).toBeVisible();
  await expect(education.getByText(/B\.S\. in Mobile Engineering/)).toBeVisible();
});

test("uses a playable demo and simple visual diagrams for selected projects", async ({ page }) => {
  await page.goto("/#projects");

  const projects = page.locator(".selected-projects-grid .project-card");
  await expect(projects).toHaveCount(3);
  await expect(projects.locator(".project-media")).toHaveCount(3);
  await expect(projects.locator(".project-media--empty, .project-overlay")).toHaveCount(0);
  await expect(projects.locator(".project-media--illustration img")).toHaveCount(2);

  const demo = projects.filter({ hasText: "ContextZip" }).getByLabel("ContextZip product demo");
  await expect(demo).toHaveAttribute("controls", "");
  await expect(demo).toHaveAttribute("playsinline", "");
  await expect(demo).toHaveAttribute("poster", "assets/images/contextzip-demo-poster.jpg");
  await expect(demo.locator("source")).toHaveAttribute("src", "assets/videos/contextzip-demo.mp4");
  await expect(demo.locator("source")).toHaveAttribute("type", "video/mp4");

  await expect(page.getByAltText("Concept diagram showing Spring code transformed into OpenAPI documentation", { exact: true })).toHaveAttribute(
    "src",
    "assets/images/code2contract-flow.svg",
  );
  await expect(page.getByAltText("Hotel recommendation workflow and tuned MAP at 5 model comparison", { exact: true })).toHaveAttribute(
    "src",
    "assets/images/hotel-recommendation-flow.svg",
  );
});

test("keeps ContextZip playback unobstructed while its story stays closed", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/#projects");

  const card = page.locator(".selected-projects-grid .project-card").filter({ hasText: "ContextZip" });
  const video = card.getByLabel("ContextZip product demo");
  const story = card.locator("details.project-story");
  await expect(card.locator(".project-overlay")).toHaveCount(0);
  expect(await story.evaluate((element: HTMLDetailsElement) => element.open)).toBe(false);
  await expect(video).toBeVisible();
  await expect(video).toHaveCSS("filter", "none");
  await expect(video).toHaveCSS("pointer-events", "auto");

  const geometry = await card.evaluate((element) => {
    const media = element.querySelector("video")?.getBoundingClientRect();
    const details = element.querySelector("details.project-story")?.getBoundingClientRect();
    return {
      mediaBottom: media?.bottom,
      storyTop: details?.top,
    };
  });
  expect(geometry.mediaBottom).toBeDefined();
  expect(geometry.storyTop).toBeDefined();
  expect(geometry.storyTop!).toBeGreaterThanOrEqual(geometry.mediaBottom! - 1);
});

test("opens every project story only by explicit click or keyboard action", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/#projects");

  const stories = page.locator(".selected-projects-grid details.project-story");
  await expect(stories).toHaveCount(3);
  for (let index = 0; index < 3; index += 1) {
    expect(await stories.nth(index).evaluate((element: HTMLDetailsElement) => element.open)).toBe(false);
  }

  await stories.nth(0).locator("summary").click();
  expect(await stories.nth(0).evaluate((element: HTMLDetailsElement) => element.open)).toBe(true);
  await expect(stories.nth(0).locator(".story-line")).toHaveCount(3);

  await stories.nth(1).locator("summary").focus();
  await stories.nth(1).locator("summary").press("Enter");
  expect(await stories.nth(1).evaluate((element: HTMLDetailsElement) => element.open)).toBe(true);
  await expect(stories.nth(1).getByText("OpenAPI", { exact: false })).toBeVisible();

  await stories.nth(2).locator("summary").click();
  expect(await stories.nth(2).evaluate((element: HTMLDetailsElement) => element.open)).toBe(true);
  await expect(stories.nth(2).getByText("MAP@5 0.4096", { exact: false })).toBeVisible();
});

test("opens project stories on touch without covering project media", async ({ browser }) => {
  const context = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/#projects");

  const cards = page.locator(".selected-projects-grid .project-card");
  const stories = cards.locator("details.project-story");
  await expect(cards.locator(".project-overlay")).toHaveCount(0);
  expect(await stories.first().evaluate((element: HTMLDetailsElement) => element.open)).toBe(false);
  await stories.first().locator("summary").click();
  expect(await stories.first().evaluate((element: HTMLDetailsElement) => element.open)).toBe(true);
  await expect(cards.first().getByLabel("ContextZip product demo")).toBeVisible();
  await expect(cards.locator(".project-media--illustration img")).toHaveCount(2);
  await expectNoHorizontalOverflow(page, 390);
  await context.close();
});

test("keeps selected project evidence links", async ({ page }) => {
  await page.goto("/#projects");

  const contextZip = page.locator(".project-card").filter({ hasText: "ContextZip" });
  await expect(contextZip.getByRole("link", { name: "Repository", exact: true })).toHaveAttribute(
    "href",
    "https://github.com/eunaverse/ContextZip",
  );
  await expect(contextZip.getByRole("link", { name: "Full demo", exact: true })).toHaveAttribute(
    "href",
    "mcpcontentsearch-demo.html#plot",
  );

  const code2Contract = page.locator(".project-card").filter({ hasText: "Code2Contract" });
  await expect(code2Contract.getByRole("link", { name: "Related prototype", exact: true })).toHaveAttribute(
    "href",
    "https://github.com/eunaverse/SpecGenerator",
  );

  const hotel = page.locator(".project-card").filter({ hasText: "Hotel Recommendation System" });
  await expect(hotel.getByRole("link", { name: "Report", exact: true })).toHaveAttribute(
    "href",
    "https://github.com/eunaverse/Hotel-Recommendation-Project/blob/main/Hotel_Recommendation.pdf",
  );
});

test("shows logo-led open source contributions with merged evidence", async ({ page }) => {
  await page.goto("/#projects");

  const openSource = page.locator(".open-source-grid");
  await expect(openSource.locator(".oss-card")).toHaveCount(2);
  await expect(openSource.getByAltText("Apache Zeppelin logo", { exact: true })).toBeVisible();
  await expect(openSource.getByAltText("Kubernetes logo", { exact: true })).toBeVisible();
  await expect(openSource.getByText("8 merged pull requests", { exact: true })).toBeVisible();
  await expect(openSource.getByText("Merged SIG Docs contribution", { exact: true })).toBeVisible();
  await expect(openSource.locator(".oss-card").first().getByRole("link")).toHaveCount(8);
  await expect(openSource.getByRole("link", { name: "View #52238", exact: true })).toHaveAttribute(
    "href",
    "https://github.com/kubernetes/website/pull/52238",
  );
});

test("loads every company school and open source logo", async ({ page }) => {
  await page.goto("/");
  await expectPageImagesLoaded(page);
});

test("preserves the existing defensible skill set", async ({ page }) => {
  await page.goto("/#skills");

  const skills = page.locator("#skills");
  await expect(skills.locator(".skill-card")).toHaveCount(4);
  for (const category of ["Languages", "Backend & Data", "Cloud & Infrastructure", "AI & Developer Tools"]) {
    await expect(skills.getByRole("heading", { name: category, exact: true })).toBeVisible();
  }
  for (const technology of ["Java, Kotlin, Python", "Spring Boot, REST APIs, Kafka", "AWS, Kubernetes, Docker", "RAG, MCP, Machine Learning", "Claude Code, Codex"]) {
    await expect(skills.getByText(new RegExp(technology.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))).toBeVisible();
  }
  await expect(skills.getByText(/LangChain|LangGraph|AgentOps|FastMCP/i)).toHaveCount(0);
});

test("keeps the recruiter section order", async ({ page }) => {
  await page.goto("/");

  const sectionOrder = await page.locator("main > section[id]").evaluateAll((sections) =>
    sections.map((section) => section.id),
  );
  expect(sectionOrder).toEqual(["home", "experience", "projects", "skills", "education", "availability"]);
  expect(await page.locator("#navLinks a").allTextContents()).toEqual([
    "Home",
    "Experience",
    "Work",
    "Skills",
    "Education",
    "Contact",
  ]);
});

test("collects contact links in the closing panel", async ({ page }) => {
  await page.goto("/#availability");

  const contact = page.locator("#availability");
  await expect(contact.getByRole("heading", { name: "Let’s build something reliable.", exact: true })).toBeVisible();
  await expect(contact.getByRole("link", { name: /Email/ })).toHaveAttribute("href", "mailto:euna.engineer@gmail.com");
  await expect(contact.getByRole("link", { name: /LinkedIn/ })).toHaveAttribute("href", "https://www.linkedin.com/in/euna-engineer/");
  await expect(contact.getByRole("link", { name: /GitHub/ })).toHaveAttribute("href", "https://github.com/eunaverse");
});

test("keeps portfolio sections visible without scroll-triggered reveal", async ({ page }) => {
  await page.goto("/");

  const opacity = await page.locator(".reveal").evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element).opacity),
  );
  expect(opacity.length).toBeGreaterThan(0);
  expect(opacity.every((value) => value === "1")).toBe(true);
});

test("keeps internal navigation targets clear of the fixed navigation", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");

  const navHeight = await page.locator("nav").evaluate((nav) => nav.getBoundingClientRect().height);
  for (const target of ["experience", "projects", "skills", "education", "availability"]) {
    await page.locator(`#navLinks a[href="#${target}"]`).click();
    await page.waitForTimeout(650);
    const top = await page.locator(`#${target}`).evaluate((section) => section.getBoundingClientRect().top);
    expect(top, `${target} should begin below the fixed navigation`).toBeGreaterThanOrEqual(navHeight - 1);
  }
});

test("keeps the visual portfolio contained on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready.then(() => true));

  await expectNoHorizontalOverflow(page, 375);
  await expect(page.getByRole("heading", { name: "Eunwha Park", exact: true })).toBeVisible();
  await expect(page.getByLabel("Mac-style terminal showing engineering focus", { exact: true })).toBeVisible();
  await expect(page.locator(".selected-projects-grid .project-card")).toHaveCount(3);
  await expect(page.locator(".education-card")).toHaveCount(2);
});

test("keeps the visual portfolio contained on tablet", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready.then(() => true));

  await expectNoHorizontalOverflow(page, 768);
  const selectedColumns = await page.locator(".selected-projects-grid").evaluate((grid) => getComputedStyle(grid).gridTemplateColumns);
  expect(selectedColumns.trim().split(/\s+/)).toHaveLength(1);
  await expect(page.locator(".skills-grid .skill-card")).toHaveCount(4);
});

test("uses the expanded visual grid on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready.then(() => true));

  await expectNoHorizontalOverflow(page, 1440);
  const selectedColumns = await page.locator(".selected-projects-grid").evaluate((grid) => getComputedStyle(grid).gridTemplateColumns);
  expect(selectedColumns.trim().split(/\s+/)).toHaveLength(3);
  const skillColumns = await page.locator(".skills-grid").evaluate((grid) => getComputedStyle(grid).gridTemplateColumns);
  expect(skillColumns.trim().split(/\s+/)).toHaveLength(4);
});

test("opens and closes the mobile navigation accessibly", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");

  const button = page.getByRole("button", { name: "Open navigation menu", exact: true });
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#navLinks")).toHaveClass(/open/);
  await page.locator("#navLinks a[href=\"#skills\"]").click();
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#navLinks")).not.toHaveClass(/open/);
});

test("marks every external new-tab link as safe", async ({ page }) => {
  await page.goto("/");

  const unsafe = await page.locator('a[target="_blank"]').evaluateAll((links) =>
    links.filter((link) => {
      const rel = new Set((link.getAttribute("rel") || "").split(/\s+/).filter(Boolean));
      return !rel.has("noopener") || !rel.has("noreferrer");
    }).length,
  );
  expect(unsafe).toBe(0);
});

test("routes the ContextZip action directly to The plot walkthrough", async ({ page }) => {
  await page.goto("/#projects");
  await page.getByRole("link", { name: "Full demo", exact: true }).click();

  await expect(page).toHaveURL(/\/mcpcontentsearch-demo\.html#plot$/);
  await expect(page).toHaveTitle("ContextZip");
  const plot = page.locator("#plot");
  await expect(plot).toHaveText("The plot");
  await expect(page.getByRole("heading", { name: "Four silos. Zero shared search." })).toBeVisible();
  await expect.poll(() => plot.evaluate((element) => element.getBoundingClientRect().top)).toBeLessThan(80);
  await expect(page.getByText("Architecture", { exact: true })).toBeAttached();
  await expect(page.getByText("Proof", { exact: true })).toBeAttached();
  await expect(page.getByText("Toolkit", { exact: true })).toBeAttached();
  await expect(page.getByRole("link", { name: "Back to portfolio" })).toHaveAttribute(
    "href",
    "index.html#projects",
  );
  const video = page.getByLabel("ContextZip product demo");
  await expect(video).toHaveAttribute("controls", "");
  await expect(video.locator("source")).toHaveAttribute("src", "assets/videos/contextzip-demo.mp4");
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState)).toBeGreaterThanOrEqual(1);
  expect(await video.evaluate((element: HTMLVideoElement) => element.error)).toBeNull();
});

test("keeps the full ContextZip proof card contained while resizing", async ({ page }) => {
  for (const width of [375, 768, 821, 900, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/mcpcontentsearch-demo.html");

    const proofCard = page.locator(".ship-card").filter({ hasText: "Skip unchanged Notion pages" });
    const column = proofCard.locator(".compare-col.after");
    const code = column.locator("code");
    const [columnBox, codeBox] = await Promise.all([column.boundingBox(), code.boundingBox()]);
    expect(columnBox).not.toBeNull();
    expect(codeBox).not.toBeNull();
    expect(codeBox!.x).toBeGreaterThanOrEqual(columnBox!.x);
    expect(codeBox!.x + codeBox!.width).toBeLessThanOrEqual(columnBox!.x + columnBox!.width + 0.5);
  }
});
