import { expect, test, type Page } from "@playwright/test";

const viewports = [
  { name: "mobile", width: 390, height: 844, minScore: 65 },
  { name: "tablet", width: 768, height: 1024, minScore: 72 },
  { name: "desktop", width: 1440, height: 900, minScore: 78 },
];

 type UxAuditResult = {
   hardGateFailures: string[];
   issues: string[];
   score: number;
 };

 async function runUxAudit(page: Page): Promise<UxAuditResult> {
   return page.evaluate(() => {
     const hardGateFailures: string[] = [];
     const issues: string[] = [];
     let score = 100;

     const doc = document.documentElement;
     const horizontalOverflow = doc.scrollWidth - doc.clientWidth;
     if (horizontalOverflow > 1) {
       hardGateFailures.push(`horizontal overflow ${horizontalOverflow}px`);
       score -= 35;
     }

     const scrollBurden = doc.scrollHeight / window.innerHeight;
     const maxScrollBurden = window.innerWidth < 600 ? 12 : window.innerWidth < 1_000 ? 9 : 8;
     if (scrollBurden > maxScrollBurden) {
       issues.push(`scroll burden ${scrollBurden.toFixed(1)} screens`);
       score -= Math.min(15, Math.ceil((scrollBurden - maxScrollBurden) * 3));
     }

     const nav = document.querySelector("nav")?.getBoundingClientRect();
  const linkTargets = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href^='#']"))
       .map((link) => link.getAttribute("href")?.slice(1))
       .filter((id): id is string => Boolean(id));
      for (const id of linkTargets) {
        if (!document.getElementById(id)) {
          hardGateFailures.push(`missing anchor target ${id}`);
          score -= 20;
        }
      }

     const tappableElements = Array.from(document.querySelectorAll<HTMLElement>("a, button")).filter((element) => {
       const rect = element.getBoundingClientRect();
       const style = getComputedStyle(element);
       return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
     });
    for (const element of tappableElements) {
      const rect = element.getBoundingClientRect();
      const minSize = window.innerWidth < 600 ? 32 : 24;
      if (rect.width < minSize || rect.height < minSize) {
        issues.push(`small tap target "${element.textContent?.trim()}" ${Math.round(rect.width)}x${Math.round(rect.height)}`);
        score -= 3;
      }
     }

     const blocks = Array.from(
       document.querySelectorAll<HTMLElement>(
         ".hero-title, .hero-description, .stat-item, .section-title, .section-subtitle, .experience-item, .education-item, .project-card, .oss-item, .skill-category, .contact-item, footer",
       ),
     ).filter((element) => {
       const rect = element.getBoundingClientRect();
       const style = getComputedStyle(element);
       return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
     });

     for (let i = 0; i < blocks.length; i += 1) {
       for (let j = i + 1; j < blocks.length; j += 1) {
         const a = blocks[i].getBoundingClientRect();
         const b = blocks[j].getBoundingClientRect();
         const overlapWidth = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
         const overlapHeight = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
         const overlapArea = overlapWidth * overlapHeight;
         if (overlapArea > 16) {
           hardGateFailures.push(
             `overlap "${blocks[i].className}" with "${blocks[j].className}" ${Math.round(overlapWidth)}x${Math.round(overlapHeight)}`,
           );
           score -= 25;
         }
       }
     }

     const firstViewportSignals = [".hero-title", ".hero-description", ".stats"];
     for (const selector of firstViewportSignals) {
       const rect = document.querySelector(selector)?.getBoundingClientRect();
       if (!rect || rect.top >= window.innerHeight || rect.bottom <= 0) {
         hardGateFailures.push(`${selector} is not visible in first viewport`);
         score -= 20;
       }
     }

     return {
       hardGateFailures,
       issues,
       score: Math.max(0, score),
     };
   });
 }

 test("renders the portfolio content and primary calls to action", async ({ page }) => {
   await page.goto("/");

   const hero = page.locator("#home");

   await expect(page).toHaveTitle(/Eunwha \(Euna\) Park \| Backend Engineer/);
  await expect(page.getByRole("heading", { name: /Eunwha \(Euna\) Park/ })).toBeVisible();
  await expect(page.getByText(/Backend engineer focused on large-scale identity and data systems/i)).toBeVisible();
  await expect(page.getByText(/50TB\+/i)).toHaveCount(1);
  await expect(page.getByText(/Open to Backend & Platform Engineer roles/i)).toBeVisible();
  await expect(page.getByText(/systems@eunaverse ~ status/i)).toBeVisible();
  await expect(page.getByText(/56M\+/i)).toHaveCount(1);
  await expect(page.getByRole("link", { name: /Resume/i })).toHaveCount(0);
   await expect(hero.getByRole("link", { name: "LinkedIn" })).toHaveCount(0);
   await expect(hero.getByRole("link", { name: /GitHub/i })).toHaveCount(0);

   for (const heading of ["Experience", "Education", "Personal & Open Source Work", "Skills & Focus", "Contact"]) {
     await expect(page.getByRole("heading", { name: heading })).toBeVisible();
   }
 });

test("keeps the career timeline clearly stated", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("#experience .job-period").getByText(/Jan 2023 - Present/i)).toBeVisible();
});

 test("uses recruiter-facing hero stats instead of leading with GPA", async ({ page }) => {
   await page.goto("/");

   const hero = page.locator("#home");
   const uiucStat = hero.locator(".stat-item").filter({ hasText: /UIUC/i });
   const awsStat = hero.locator(".stat-item").filter({ hasText: "AWS" });
   const ossStat = hero.locator(".stat-item").filter({ hasText: "Merged OSS PRs" });

   await expect(uiucStat.getByText(/UIUC/i)).toBeVisible();
   await expect(uiucStat.getByText(/2026/)).toBeVisible();
   await expect(ossStat.getByText("9", { exact: true })).toBeVisible();
   await expect(awsStat.getByText("AWS", { exact: true })).toBeVisible();
   await expect(awsStat.getByText("Solutions Architect Pro", { exact: true })).toBeVisible();
  await expect(hero.getByText("University GPA")).toHaveCount(0);
 });

test("focuses the project section on the strongest recruiter-facing GitHub work", async ({ page }) => {
  await page.goto("/");

  const projectTitles = await page.locator("#projects .project-title").allTextContents();

   expect(projectTitles).toEqual([
     "ContextWiki",
     "ai-news-alerts",
     "Apache Zeppelin",
   ]);

   const projects = page.locator("#projects");
   await expect(projects.getByText(/Private MCP server for agents/i)).toBeVisible();
   await expect(projects.getByText(/Daily Slack digest from HN \+ RSS/i)).toBeVisible();
   for (const removedProject of [
     "RepoLens",
     "Agent Harness Playbook + Codex Config",
     "ImageGallery",
     "Lanternwood Athenaeum",
   ]) {
     await expect(projects.getByText(removedProject, { exact: true })).toHaveCount(0);
   }

 });

  test("keeps experience narrative concise and portfolio-friendly", async ({ page }) => {
   await page.goto("/");

   const experience = page.locator("#experience");

   await expect(experience.getByText("Backend Software Engineer", { exact: true })).toBeVisible();
   await expect(experience.getByText("Jan 2023 - Present", { exact: true })).toBeVisible();
   await expect(experience.getByText(/Training:/i)).toHaveCount(0);
   await expect(experience.locator(".job-description li")).toHaveCount(0);
   await expect(experience.locator(".exp-hit")).toHaveCount(3);
   await expect(experience.getByText(/400M\+ monthly active users/i)).toBeVisible();
   await expect(experience.getByRole("heading", { name: "Keep users online while the database changes", exact: true })).toBeVisible();
   await expect(experience.getByRole("heading", { name: "Safer identity for users, freer shipping for teams", exact: true })).toBeVisible();
   await expect(experience.getByRole("heading", { name: "Fewer failed requests in the real product path", exact: true })).toBeVisible();
   await expect(experience.getByText(/78B\+/i)).toBeVisible();
   await expect(experience.getByText(/\$2\.2M/i)).toBeVisible();
   await expect(experience.getByText(/99\.5%\+/i)).toBeVisible();
   await expect(experience.getByText(/56M\+/i)).toBeVisible();
   await expect(experience.getByText(/4 calls to 1|61%/i)).toHaveCount(0);
   for (const focus of ["Large-scale migration", "Cloud-native operations", "Data consistency", "Distributed systems"]) {
     await expect(experience.getByText(focus, { exact: true })).toBeVisible();
   }
   await expect(experience.getByText(/agent-assisted engineering harnesses/i)).toHaveCount(0);
 });

 test("shows the education timeline with the UIUC MCS program", async ({ page }) => {
   await page.goto("/");

   const education = page.locator("#education");
   await expect(education.getByText("University of Illinois Urbana-Champaign")).toBeVisible();
   await expect(education.getByText("Master of Computer Science (MCS)", { exact: true })).toBeVisible();
   await expect(education.getByText(/Incoming/i)).toHaveCount(0);
   await expect(education.getByText("2026 - 2028")).toBeVisible();
   await expect(education.getByText("Kyungpook National University")).toBeVisible();
   await expect(education.getByText("Mobile Engineering")).toBeVisible();
   await expect(education.getByText(/GPA 4\.45 \/ 4\.5/)).toBeVisible();
   await expect(education.getByText(/Ranked 1st \/ 33/)).toBeVisible();
   await expect(education.getByText("Systems", { exact: true })).toBeVisible();
   await expect(education.getByText(/AI-adjacent infrastructure/i)).toHaveCount(0);
 });

 test("uses defensible skill categories without overclaiming frontend tooling", async ({ page }) => {
   await page.goto("/");

   const skills = page.locator("#skills");
   await expect(skills.getByText(/Tools I reach for when systems need to be reliable/i)).toHaveCount(0);
   await expect(skills.getByText("Backend & Data Systems")).toBeVisible();
   await expect(skills.getByText("Cloud & Delivery")).toBeVisible();
   await expect(skills.getByText("AI Tooling")).toBeVisible();
   await expect(skills.getByText(/LLM-assisted coding/i)).toBeVisible();
   await expect(skills.getByText(/Claude, Codex, Cursor, Gemini/i)).toBeVisible();
   await expect(skills.getByText(/Distributed Systems/i)).toBeVisible();
   await expect(skills.getByText(/System Design/i)).toBeVisible();
   await expect(skills.getByText(/Spark/i)).toBeVisible();
   await expect(skills.getByText(/FastMCP/i)).toHaveCount(0);
   await expect(skills.getByText(/Personal projects/i)).toHaveCount(0);

   for (const technology of ["PixiJS", "Vitest", "Playwright", "AI Engineering Tooling", "Agent Workflow Observability"]) {
     await expect(skills.getByText(technology, { exact: true })).toHaveCount(0);
   }
 });

test("keeps project cards concise and points to evidence", async ({ page }) => {
  await page.goto("/");

   const cards = page.locator("#projects .project-card");
   await expect(cards).toHaveCount(3);

  const descriptions = await cards.locator(".project-description").allTextContents();
  for (const description of descriptions) {
    expect(description.trim().length).toBeLessThanOrEqual(260);
  }

   const contextWiki = cards.filter({ hasText: "ContextWiki" });
   await expect(contextWiki.locator(".project-evidence").getByRole("link")).toHaveCount(2);
   await expect(contextWiki.getByRole("link", { name: "Repository", exact: true })).toBeVisible();
   await expect(contextWiki.getByRole("link", { name: "Demo", exact: true })).toBeVisible();

   const news = cards.filter({ hasText: "ai-news-alerts" });
   await expect(news.locator(".project-evidence").getByRole("link", { name: "Repository", exact: true })).toBeVisible();

  for (const removedLabel of ["Architecture", "Core Loop", "Local e2e verified", "Sample Output", "Source Strategy"]) {
    await expect(page.locator("#projects").getByText(removedLabel, { exact: true })).toHaveCount(0);
  }
});

test("routes the MCPContentSearch demo link to a dedicated walkthrough page", async ({ page }) => {
  await page.goto("/");

  const projectCard = page.locator("#projects .project-card").filter({ hasText: "ContextWiki" });
  const demoLink = projectCard.getByRole("link", { name: "Demo", exact: true });

  await expect(demoLink).toHaveAttribute("href", "/mcpcontentsearch-demo.html");

  await demoLink.click();
  await expect(page).toHaveURL(/\/mcpcontentsearch-demo\.html$/);
  await expect(page).toHaveTitle("ContextWiki");
  await expect(page.getByRole("heading", { name: "ContextWiki", exact: true })).toBeVisible();
  await expect(page.getByText(/private MCP server for LLM agents/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "View Repository", exact: true })).toHaveAttribute(
    "href",
    "https://github.com/eunaverse/MCPContentSearch",
  );
  await expect(page.getByText(/The plot/i)).toBeVisible();
  await expect(page.locator(".story", { hasText: "The payoff" }).getByText("search_context", { exact: true })).toBeVisible();
});

 test("groups open source contributions into evidence-backed upstream work", async ({ page }) => {
   await page.goto("/");

   const projects = page.locator("#projects");
   const openSourceCards = projects.locator(".project-card").filter({ hasText: /Open Source/ });

   await expect(openSourceCards).toHaveCount(1);
   await expect(projects.getByText("Apache Zeppelin", { exact: true })).toBeVisible();
   await expect(projects.getByText(/Grand Prize \(1st place\)/i)).toBeVisible();
   await expect(projects.getByText(/Korean Open Source Contribution Program/i)).toBeVisible();
   await expect(projects.getByText(/additional cleanup and refactoring upstream/i)).toBeVisible();
   await expect(projects.getByText("Kubernetes Website", { exact: true })).toHaveCount(0);
   await expect(projects.getByText(/More projects and experiments on/i)).toBeVisible();
   await expect(projects.locator(".projects-github-more").getByRole("link", { name: "GitHub →" })).toHaveAttribute(
     "href",
     "https://github.com/eunaverse",
   );

   for (const linkName of [
     "ZEPPELIN-6220",
     "ZEPPELIN-6243",
     "ZEPPELIN-6285",
     "ZEPPELIN-6300",
     "ZEPPELIN-6306",
     "ZEPPELIN-6299",
     "ZEPPELIN-6264",
     "ZEPPELIN-6242",
   ]) {
     await expect(projects.getByRole("link", { name: linkName })).toHaveAttribute("href", /github\.com\/apache\/zeppelin\/pull\//);
   }
 });

 test("shows personal learning automation project", async ({ page }) => {
   await page.goto("/");

   const projects = page.locator("#projects");
   await expect(projects.getByText("ai-news-alerts", { exact: true })).toBeVisible();
   await expect(projects.getByText(/Daily Slack digest from HN \+ RSS/i)).toBeVisible();
 });

 test("collects contact links outside the hero", async ({ page }) => {
   await page.goto("/");

   const availability = page.locator("#availability");

   await expect(availability.getByRole("heading", { name: "Contact" })).toBeVisible();
   await expect(availability.getByText(/Happy to talk about backend systems/i)).toBeVisible();
   await expect(availability.getByRole("link", { name: "Email" })).toHaveAttribute(
     "href",
     "mailto:euna.engineer@gmail.com",
   );
   await expect(availability.getByRole("link", { name: /LinkedIn/i })).toHaveAttribute(
     "href",
     "https://www.linkedin.com/in/eunhwa-park-20a286248/",
   );
   await expect(availability.getByRole("link", { name: /GitHub/i })).toHaveAttribute("href", "https://github.com/eunaverse");
   await expect(availability.getByRole("link", { name: /Resume/i })).toHaveCount(0);
 });

test("keeps internal navigation targets below the fixed nav", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const targetByLinkName: Record<string, string> = {
    Home: "home",
    Experience: "experience",
    Education: "education",
    Work: "projects",
    Skills: "skills",
    Contact: "availability",
  };

  for (const linkName of Object.keys(targetByLinkName)) {
    await page.locator("nav").getByRole("link", { name: linkName, exact: true }).click();
    const targetId = targetByLinkName[linkName];
    await expect(page.locator(`#${targetId}`)).toBeInViewport();

    if (linkName === "Home") {
      continue;
    }

     const clearance = await page.evaluate((id) => {
       const navBottom = document.querySelector("nav")?.getBoundingClientRect().bottom ?? 0;
       const targetTop = document.getElementById(id)?.getBoundingClientRect().top ?? 0;
       return targetTop - navBottom;
     }, targetId);
     expect(clearance, `${linkName} should not be hidden by the fixed nav`).toBeGreaterThanOrEqual(-1);
   }
 });

 for (const viewport of viewports) {
   test(`scores responsive UX quality on ${viewport.name}`, async ({ page }) => {
     await page.setViewportSize({ width: viewport.width, height: viewport.height });
     await page.goto("/");

     const audit = await runUxAudit(page);

     expect(audit.hardGateFailures, `${viewport.name} hard gate failures`).toEqual([]);
     expect(audit.score, `${viewport.name} UX score issues: ${audit.issues.join("; ")}`).toBeGreaterThanOrEqual(viewport.minScore);
   });
 }

test("keeps hero priority content visible in the mobile first viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 844 });
  await page.goto("/");

  const heroRects = await page.locator("#home .hero-title, #home .hero-description, #home .hero-location-roles, #home .stat-item").evaluateAll((items) =>
    items.map((button) => {
      const rect = button.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        text: button.textContent?.trim() ?? "",
        top: rect.top,
      };
    }),
  );

  expect(heroRects).toHaveLength(7);
  for (const rect of heroRects) {
    expect(rect.top, `${rect.text} should be visible below the fixed nav`).toBeGreaterThanOrEqual(70);
    expect(rect.bottom, `${rect.text} should fit in the first mobile viewport`).toBeLessThanOrEqual(844);
  }
});

 test("marks external new-tab links as safe", async ({ page }) => {
   await page.goto("/");

   const unsafeLinks = await page.evaluate(() =>
     Array.from(document.querySelectorAll<HTMLAnchorElement>("a[target='_blank']"))
       .filter((link) => {
         const rel = new Set((link.getAttribute("rel") ?? "").split(/\s+/).filter(Boolean));
         return !rel.has("noopener") || !rel.has("noreferrer");
       })
       .map((link) => link.href),
   );

   expect(unsafeLinks).toEqual([]);
 });
