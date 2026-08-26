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

   await expect(page).toHaveTitle(/Eunwha Park \| Backend & Distributed Systems Engineer/);
  await expect(page.getByRole("heading", { name: "Eunwha Park", exact: true })).toBeVisible();
  await expect(page.getByText(/Building large-scale data systems/i)).toBeVisible();
  await expect(page.getByText(/Urbana, IL/i)).toBeVisible();
  await expect(page.getByText(/systems@eunaverse ~ status/i)).toBeVisible();
  await expect(page.getByText(/56M\+/i)).toHaveCount(1);
  await expect(page.getByText(/18K QPS/i)).toHaveCount(2);
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
  await expect(page.locator("#experience .job-period").getByText(/Mar 2022 - Jun 2022/i)).toBeVisible();
});

 test("uses recruiter-facing hero stats instead of leading with GPA", async ({ page }) => {
   await page.goto("/");

   const hero = page.locator("#home");
   const migrationStat = hero.locator(".stat-item").filter({ hasText: "Records Migrated" });
   const costStat = hero.locator(".stat-item").filter({ hasText: "Annual Cost Reduction" });
   const sloStat = hero.locator(".stat-item").filter({ hasText: "Monthly SLO" });
   const ossStat = hero.locator(".stat-item").filter({ hasText: "Merged OSS PRs" });

   await expect(migrationStat.getByText("78B+", { exact: true })).toBeVisible();
   await expect(costStat.getByText("$2.2M", { exact: true })).toBeVisible();
   await expect(sloStat.getByText("99.5%+", { exact: true })).toBeVisible();
   await expect(ossStat.getByText("9", { exact: true })).toBeVisible();
  await expect(hero.getByText("University GPA")).toHaveCount(0);
 });

test("focuses the project section on the strongest recruiter-facing GitHub work", async ({ page }) => {
  await page.goto("/");

  const projectTitles = await page.locator("#projects .project-title").allTextContents();

   expect(projectTitles).toEqual([
     "ContextZip",
     "Code2Contract",
     "Hotel Recommendation System",
     "Apache Zeppelin",
     "Kubernetes Website",
   ]);

   const projects = page.locator("#projects");
   await expect(projects.getByText(/reducing data re-sync latency by 93%/i)).toBeVisible();
   await expect(projects.getByText(/self-service API documentation system/i)).toBeVisible();
   await expect(projects.getByText(/MAP@5 of 0\.37/i)).toBeVisible();
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
   await expect(experience.getByText("Software Engineer Intern", { exact: true })).toBeVisible();
   await expect(experience.getByText("Mar 2022 - Jun 2022", { exact: true })).toBeVisible();
   await expect(experience.getByText(/Training:/i)).toHaveCount(0);
   await expect(experience.locator(".job-description li")).toHaveCount(0);
   await expect(experience.locator(".exp-hit")).toHaveCount(5);
   await expect(experience.getByRole("heading", { name: "Migrate 78B+ records without downtime", exact: true })).toBeVisible();
   await expect(experience.getByRole("heading", { name: "Double regional batch throughput", exact: true })).toBeVisible();
   await expect(experience.getByRole("heading", { name: "Reduce identity exposure and coupling", exact: true })).toBeVisible();
   await expect(experience.getByRole("heading", { name: "Move write-heavy workloads to Cassandra", exact: true })).toBeVisible();
   await expect(experience.getByRole("heading", { name: "Eliminate recurring reliability failures", exact: true })).toBeVisible();
   await expect(experience.getByText(/78B\+/i)).toBeVisible();
   await expect(experience.getByText(/\$2\.2M/i)).toBeVisible();
   await expect(experience.getByText(/108%/i)).toBeVisible();
   await expect(experience.getByText(/\$700K\+\/year/i)).toBeVisible();
   await expect(experience.getByText(/18K QPS/i)).toBeVisible();
   await expect(experience.getByText(/99\.5%\+/i)).toBeVisible();
   await expect(experience.getByText(/56M\+/i)).toBeVisible();
   await expect(experience.getByText(/10\+ smartphone system features/i)).toBeVisible();
   await expect(experience.getByText(/4 calls to 1|61%/i)).toHaveCount(0);
   for (const focus of ["Large-scale migration", "Reliability & performance", "Identity architecture", "Distributed systems"]) {
     await expect(experience.getByText(focus, { exact: true })).toBeVisible();
   }
   await expect(experience.getByText(/agent-assisted engineering harnesses/i)).toHaveCount(0);
 });

 test("shows the education timeline with the UIUC MCS program", async ({ page }) => {
   await page.goto("/");

   const education = page.locator("#education");
   await expect(education.getByText("University of Illinois Urbana-Champaign")).toBeVisible();
   await expect(education.getByText("Master of Computer Science", { exact: true })).toBeVisible();
   await expect(education.getByText(/Incoming/i)).toHaveCount(0);
   await expect(education.getByText("Aug 2026 - May 2028")).toBeVisible();
   await expect(education.getByText("Kyungpook National University")).toBeVisible();
   await expect(education.getByText(/B\.S\. in Mobile Engineering \(Academic Chair\)/)).toBeVisible();
   await expect(education.getByText("Mar 2019 - Feb 2023")).toBeVisible();
   await expect(education.getByText(/GPA 4\.23 \/ 4\.3/)).toBeVisible();
   for (const course of ["Distributed Systems", "Advanced Topics in NLP", "Database Systems"]) {
     await expect(education.getByText(course, { exact: true })).toBeVisible();
   }
   await expect(education.getByText(/AI-adjacent infrastructure/i)).toHaveCount(0);
 });

 test("uses defensible skill categories without overclaiming frontend tooling", async ({ page }) => {
   await page.goto("/");

   const skills = page.locator("#skills");
   await expect(skills.getByText(/Tools I reach for when systems need to be reliable/i)).toHaveCount(0);
   for (const category of ["Languages", "Backend & Data", "Cloud & Infrastructure", "AI & Developer Tools"]) {
     await expect(skills.getByText(category, { exact: true })).toBeVisible();
   }
   for (const technology of ["Java, Kotlin, Python", "Spring Boot, REST APIs, Kafka", "AWS, Kubernetes, Docker", "RAG, LangChain, MCP", "Claude Code, Codex"]) {
     await expect(skills.locator(".skill-list").filter({ hasText: technology })).toBeVisible();
   }
   const certification = skills.locator(".certification-card");
   await expect(certification.getByText("AWS Certified Solutions Architect - Professional", { exact: true })).toBeVisible();
   await expect(certification.getByText("Jan 2025", { exact: true })).toBeVisible();
   await expect(skills.getByText(/Spark|Jenkins|Cursor|Gemini|LlamaIndex|ChromaDB/i)).toHaveCount(0);
   await expect(skills.getByText(/FastMCP/i)).toHaveCount(0);
   await expect(skills.getByText(/Personal projects/i)).toHaveCount(0);

   for (const technology of ["PixiJS", "Vitest", "Playwright", "AI Engineering Tooling", "Agent Workflow Observability"]) {
     await expect(skills.getByText(technology, { exact: true })).toHaveCount(0);
   }
 });

test("keeps project cards concise and points to evidence", async ({ page }) => {
  await page.goto("/");

   const cards = page.locator("#projects .project-card");
   await expect(cards).toHaveCount(5);

  const descriptions = await cards.locator(".project-description").allTextContents();
  for (const description of descriptions) {
    expect(description.trim().length).toBeLessThanOrEqual(260);
  }

   const contextZip = cards.filter({ hasText: "ContextZip" });
   await expect(contextZip.locator(".project-evidence").getByRole("link")).toHaveCount(2);
   const repositoryLink = contextZip.getByRole("link", { name: "Repository", exact: true });
   const demoLink = contextZip.getByRole("link", { name: "Demo", exact: true });
   await expect(repositoryLink).toBeVisible();
   await expect(repositoryLink).toHaveAttribute("href", "https://github.com/eunaverse/ContextZip");
   await expect(demoLink).toBeVisible();
   await expect(demoLink).toHaveClass(/evidence-link-demo/);

   const [repositoryStyle, demoStyle] = await Promise.all([
     repositoryLink.evaluate((link) => ({
       backgroundImage: getComputedStyle(link).backgroundImage,
       color: getComputedStyle(link).color,
     })),
     demoLink.evaluate((link) => ({
       backgroundImage: getComputedStyle(link).backgroundImage,
       color: getComputedStyle(link).color,
     })),
   ]);
   expect(repositoryStyle.backgroundImage).toBe("none");
   expect(demoStyle.backgroundImage).not.toBe("none");
   expect(demoStyle.color).not.toBe(repositoryStyle.color);

   const code2Contract = cards.filter({ hasText: "Code2Contract" });
   await expect(code2Contract.getByRole("link")).toHaveCount(0);
   const hotel = cards.filter({ hasText: "Hotel Recommendation System" });
   await expect(hotel.getByRole("link", { name: "Project Report", exact: true })).toHaveAttribute(
     "href",
     "https://github.com/eunaverse/Hotel-Recommendation-Project/blob/main/Hotel_Recommendation.pdf",
   );

  for (const removedLabel of ["Architecture", "Core Loop", "Local e2e verified", "Sample Output", "Source Strategy"]) {
    await expect(page.locator("#projects").getByText(removedLabel, { exact: true })).toHaveCount(0);
  }
});

test("aligns selected project footers while cards share a row", async ({ page }) => {
  for (const width of [769, 820, 900, 1024, 1100, 1101, 1200, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/#projects");
    await page.evaluate(() => document.fonts.ready.then(() => true));

    const positions = await page.locator(".selected-projects-grid").evaluate((grid) => {
      const cards = Array.from(grid.querySelectorAll<HTMLElement>(".project-card"));
      const bounds = (element: Element | null | undefined) => element?.getBoundingClientRect() ?? null;

      return cards.map((card) => ({
        card: bounds(card),
        tech: bounds(card.querySelector(".tech-stack")),
      }));
    });

    expect(positions).toHaveLength(3);
    for (const position of positions) {
      expect(position.card).not.toBeNull();
      expect(position.tech).not.toBeNull();
    }

    for (let i = 0; i < positions.length; i += 1) {
      for (let j = i + 1; j < positions.length; j += 1) {
        if (Math.abs(positions[i].card!.y - positions[j].card!.y) <= 1) {
          expect.soft(
            Math.abs(positions[i].tech!.bottom - positions[j].tech!.bottom),
            `Technology rows should align at ${width}px`,
          ).toBeLessThanOrEqual(1);
        }
      }
    }
  }
});

test("routes the ContextZip demo link to a playable video", async ({ page }) => {
  for (const width of [375, 900, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/#projects");

    const projectCard = page.locator("#projects .project-card").filter({ hasText: "ContextZip" });
    const demoLink = projectCard.getByRole("link", { name: "Demo", exact: true });

    await expect(demoLink).toHaveAttribute("href", "/mcpcontentsearch-demo.html");
    await demoLink.click();
    await expect(page).toHaveURL(/\/mcpcontentsearch-demo\.html$/);
    await expect(page).toHaveTitle("ContextZip");
    await expect(page.getByRole("heading", { name: "ContextZip", exact: true })).toBeVisible();
  }

  await expect(page.getByText(/private MCP server for LLM agents/i)).toBeVisible();
  const demoVideo = page.getByLabel("ContextZip product demo");
  await expect(demoVideo).toBeVisible();
  await expect(demoVideo).toHaveAttribute("controls", "");
  await expect(demoVideo).toHaveAttribute("playsinline", "");
  await expect(demoVideo.locator("source")).toHaveAttribute("src", "assets/videos/contextzip-demo.mp4");
  await expect(demoVideo.locator("source")).toHaveAttribute("type", "video/mp4");
  await expect.poll(() => demoVideo.evaluate((video: HTMLVideoElement) => video.readyState)).toBeGreaterThanOrEqual(1);
  expect(await demoVideo.evaluate((video: HTMLVideoElement) => video.duration)).toBeGreaterThan(0);
  expect(await demoVideo.evaluate((video: HTMLVideoElement) => video.error)).toBeNull();
  await expect(page.getByRole("link", { name: "View Repository", exact: true })).toHaveAttribute(
    "href",
    "https://github.com/eunaverse/ContextZip",
  );
  for (const pullRequest of [88, 89, 91, 93]) {
    await expect(page.getByRole("link", { name: `#${pullRequest}`, exact: true })).toHaveAttribute(
      "href",
      `https://github.com/eunaverse/ContextZip/pull/${pullRequest}`,
    );
  }
  await expect(page.getByText(/The plot/i)).toBeVisible();
  await expect(page.locator(".story", { hasText: "The payoff" }).getByText("search_context", { exact: true })).toBeVisible();
});

test("keeps ContextZip proof card content contained while resizing", async ({ page }) => {
  for (const width of [375, 768, 821, 860, 900, 960, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/mcpcontentsearch-demo.html");

    const proofCard = page.locator(".ship-card").filter({ hasText: "Skip unchanged Notion pages" });
    const afterColumn = proofCard.locator(".compare-col.after");
    const lastEditedTime = afterColumn.locator("code");

    const bounds = await Promise.all([afterColumn.boundingBox(), lastEditedTime.boundingBox()]);
    expect(bounds[0], `after column should render at ${width}px`).not.toBeNull();
    expect(bounds[1], `last_edited_time should render at ${width}px`).not.toBeNull();
    expect(bounds[1]!.x, `last_edited_time left edge at ${width}px`).toBeGreaterThanOrEqual(bounds[0]!.x);
    expect(bounds[1]!.x + bounds[1]!.width, `last_edited_time right edge at ${width}px`).toBeLessThanOrEqual(
      bounds[0]!.x + bounds[0]!.width + 0.5,
    );
  }
});

 test("groups open source contributions into evidence-backed upstream work", async ({ page }) => {
   await page.goto("/");

   const projects = page.locator("#projects");
   const openSourceCards = projects.locator(".project-card").filter({ hasText: /Open Source/ });

   await expect(openSourceCards).toHaveCount(2);
   const zeppelinCard = openSourceCards.filter({ hasText: "Apache Zeppelin" });
   await expect(zeppelinCard.getByText("Apache Zeppelin", { exact: true })).toBeVisible();
   await expect(zeppelinCard.locator(".project-card-main").locator(":scope > *")).toHaveCount(3);
   expect(
     await zeppelinCard.locator(".project-card-main").locator(":scope > *").evaluateAll((elements) =>
       elements.map((element) => element.className),
     ),
   ).toEqual(["project-title", "project-period", "project-description"]);
   await expect(zeppelinCard.locator(".oss-prize-badge")).toHaveCount(0);
   await expect(
     zeppelinCard.getByText(/1st Place|Grand Prize|OSSCA|Korean Open Source Contribution Program/i),
   ).toHaveCount(0);
   await expect(projects.getByText(/resolved null-pointer failures, modernized dependencies/i)).toBeVisible();
   const kubernetesCard = openSourceCards.filter({ hasText: "Kubernetes Website" });
   await expect(kubernetesCard.locator(".oss-prize-placeholder")).toHaveCount(0);
   await expect(kubernetesCard.getByText("Kubernetes Website", { exact: true })).toBeVisible();
   await expect(kubernetesCard.getByText(/Localized Kubernetes architecture documentation into Korean/i)).toBeVisible();
   await expect(kubernetesCard.getByText(/non-English-speaking cloud-native learners/i)).toBeVisible();
   await expect(kubernetesCard.getByRole("link", { name: "#52238 · ingress-minikube", exact: true })).toHaveAttribute(
     "href",
     "https://github.com/kubernetes/website/pull/52238",
   );
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

test("aligns open source evidence and technology rows while cards share a row", async ({ page }) => {
  for (const width of [769, 820, 900, 1024, 1100, 1200, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/#projects");
    await page.evaluate(() => document.fonts.ready.then(() => true));

    const positions = await page.locator("#projects .projects-grid").filter({ hasText: "Apache Zeppelin" }).evaluate((grid) => {
      const cards = Array.from(grid.querySelectorAll<HTMLElement>(".project-card"));
      const zeppelin = cards.find((card) => card.textContent?.includes("Apache Zeppelin"));
      const kubernetes = cards.find((card) => card.textContent?.includes("Kubernetes Website"));
      const bounds = (element: Element | null | undefined) => element?.getBoundingClientRect() ?? null;

      return {
        kubernetesCard: bounds(kubernetes),
        kubernetesTitle: bounds(kubernetes?.querySelector(".project-title")),
        kubernetesPeriod: bounds(kubernetes?.querySelector(".project-period")),
        kubernetesDescription: bounds(kubernetes?.querySelector(".project-description")),
        kubernetesEvidence: bounds(kubernetes?.querySelector(".project-evidence")),
        kubernetesTech: bounds(kubernetes?.querySelector(".tech-stack")),
        zeppelinCard: bounds(zeppelin),
        zeppelinTitle: bounds(zeppelin?.querySelector(".project-title")),
        zeppelinPeriod: bounds(zeppelin?.querySelector(".project-period")),
        zeppelinDescription: bounds(zeppelin?.querySelector(".project-description")),
        zeppelinEvidence: bounds(zeppelin?.querySelector(".project-evidence")),
        zeppelinTech: bounds(zeppelin?.querySelector(".tech-stack")),
      };
    });

    expect(positions.zeppelinCard).not.toBeNull();
    expect(positions.kubernetesCard).not.toBeNull();
    expect(positions.zeppelinTitle).not.toBeNull();
    expect(positions.kubernetesTitle).not.toBeNull();
    expect(positions.zeppelinPeriod).not.toBeNull();
    expect(positions.kubernetesPeriod).not.toBeNull();
    expect(positions.zeppelinDescription).not.toBeNull();
    expect(positions.kubernetesDescription).not.toBeNull();
    expect(positions.zeppelinEvidence).not.toBeNull();
    expect(positions.kubernetesEvidence).not.toBeNull();
    expect(positions.zeppelinTech).not.toBeNull();
    expect(positions.kubernetesTech).not.toBeNull();

    if (Math.abs(positions.zeppelinCard!.y - positions.kubernetesCard!.y) <= 1) {
      expect.soft(
        Math.abs(positions.zeppelinTitle!.y - positions.kubernetesTitle!.y),
        `Open source title rows should align at ${width}px`,
      ).toBeLessThanOrEqual(1);
      expect.soft(
        Math.abs(positions.zeppelinPeriod!.y - positions.kubernetesPeriod!.y),
        `Open source subtitle rows should align at ${width}px`,
      ).toBeLessThanOrEqual(1);
      expect.soft(
        Math.abs(positions.zeppelinDescription!.y - positions.kubernetesDescription!.y),
        `Open source description rows should align at ${width}px`,
      ).toBeLessThanOrEqual(1);
      expect.soft(
        Math.abs(positions.zeppelinEvidence!.y - positions.kubernetesEvidence!.y),
        `Open source evidence rows should align at ${width}px`,
      ).toBeLessThanOrEqual(1);
      expect.soft(
        Math.abs(positions.zeppelinTech!.y - positions.kubernetesTech!.y),
        `Open source technology rows should align at ${width}px`,
      ).toBeLessThanOrEqual(1);
    }
  }
});

 test("shows resume-selected project evidence", async ({ page }) => {
   await page.goto("/");

   const projects = page.locator("#projects");
   await expect(projects.getByText("Code2Contract", { exact: true })).toBeVisible();
   await expect(projects.getByText(/manual minutes → seconds/i)).toBeVisible();
   await expect(projects.getByText("Hotel Recommendation System", { exact: true })).toBeVisible();
   await expect(projects.getByText(/MAP@5 of 0\.37/i)).toBeVisible();
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
     "https://www.linkedin.com/in/euna-engineer/",
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
