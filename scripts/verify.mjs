// Visual check of the Pages build: serves dist under /angular-dashboard-demo/ in-process,
// screenshots the page at four widths in light and dark, measures the layout and the
// charts, and drives the dock (section links, theme, demo states) and the URL filters.
// Closes its own server.
// Usage: pnpm build:pages && node scripts/verify.mjs [outDir]
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const BASE = '/angular-dashboard-demo/';
const DIST = 'dist/angular-dashboard-demo/browser';
const OUT = process.argv[2] ?? '.claude/tmp/verify';
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.ico': 'image/x-icon',
};

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (!path.startsWith(BASE)) return void res.writeHead(404).end();
  let file = normalize(join(DIST, path.slice(BASE.length)));
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, resolve));
const origin = `http://localhost:${server.address().port}${BASE}`;
await mkdir(OUT, { recursive: true });

const problems = [];
const report = [];
const expect = (ok, message) => ok || problems.push(message);

// From 640px the menu is a rail beside the content; below, a bar along the bottom.
const sizes = [
  ['phone', 390, 844, { bar: true }],
  ['tablet', 768, 1024, { bar: false }],
  ['desktop', 1280, 800, { bar: false }],
  ['wide', 1920, 1080, { bar: false }],
];

const measure = (page) =>
  page.evaluate(() => {
    const style = (sel) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el) : null;
    };
    const dock = document.querySelector('.dock').getBoundingClientRect();
    const main = document.querySelector('main').getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      dark: document.documentElement.classList.contains('dark'),
      title: document.title,
      h1: document.querySelector('h1')?.textContent?.trim(),
      dock: {
        left: Math.round(dock.left),
        right: Math.round(document.documentElement.clientWidth - dock.right),
        top: Math.round(dock.top),
        bottom: Math.round(window.innerHeight - dock.bottom),
        width: Math.round(dock.width),
        height: Math.round(dock.height),
      },
      contentLeft: Math.round(document.getElementById('overview').getBoundingClientRect().left),
      dockBlur: style('.dock').backdropFilter,
      cardBlur: style('.card')?.backdropFilter,
      main: { left: Math.round(main.left), width: Math.round(main.width) },
      active: document.querySelector('.dock [aria-current="location"]')?.getAttribute('aria-label'),
      charts: [...document.querySelectorAll('app-echart')].map((c) => {
        const canvas = c.querySelector('canvas')?.getBoundingClientRect();
        return canvas ? Math.round(canvas.width) + 'x' + Math.round(canvas.height) : 'none';
      }),
      sankey: (({ width, height }) => ({ w: Math.round(width), h: Math.round(height) }))(
        document.querySelector('app-sankey svg')?.getBoundingClientRect() ?? {
          width: 0,
          height: 0,
        },
      ),
    };
  });

const sectionTop = (page, id) =>
  page.evaluate((id) => Math.round(document.getElementById(id).getBoundingClientRect().top), id);

// Waits until a (smooth) scroll has stopped moving.
const settled = (page) =>
  page.waitForFunction(
    () =>
      new Promise((done) => {
        let last = -1;
        const tick = () =>
          scrollY === last ? done(true) : ((last = scrollY), setTimeout(tick, 150));
        tick();
      }),
  );

const ready = async (page) => {
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('app-kpi-card .value', { timeout: 5000 });
  await page.waitForSelector('app-data-table tr.row', { timeout: 5000 });
  await page.waitForFunction(
    () => document.querySelectorAll('app-echart canvas').length >= 4,
    null,
    {
      timeout: 8000,
    },
  );
  // Let the chart animations settle: a mid-animation capture is not evidence.
  await page.waitForTimeout(800);
};

const browser = await chromium.launch({ headless: false });
try {
  for (const [name, width, height, want] of sizes) {
    for (const scheme of ['light', 'dark']) {
      const page = await browser.newPage({ viewport: { width, height }, colorScheme: scheme });
      page.on(
        'console',
        (m) => m.type() === 'error' && problems.push(`${name}/${scheme}: ${m.text()}`),
      );
      page.on('response', (r) => r.status() >= 400 && problems.push(`${r.status()} ${r.url()}`));
      await page.goto(origin);
      await ready(page);
      const m = await measure(page);
      const label = `${name}/${scheme}`;
      expect(m.overflow <= 0, `${label}: ${m.overflow}px horizontal overflow`);
      expect(m.dark === (scheme === 'dark'), `${label}: .dark is ${m.dark}`);
      expect(m.dockBlur.includes('blur'), `${label}: dock is not glass`);
      expect(m.cardBlur === 'none', `${label}: card has backdrop-filter ${m.cardBlur}`);
      if (want.bar) {
        expect(
          Math.abs(m.dock.left - m.dock.right) <= 1 && m.dock.left >= 8 && m.dock.bottom <= 16,
          `${label}: bottom bar not centred inside the screen ${JSON.stringify(m.dock)}`,
        );
      } else {
        expect(
          Math.abs(m.dock.top - m.dock.bottom) <= 1,
          `${label}: rail not vertically centred ${JSON.stringify(m.dock)}`,
        );
        expect(
          m.dock.left + m.dock.width + 12 <= m.contentLeft,
          `${label}: rail ends at ${m.dock.left + m.dock.width}, content starts at ${m.contentLeft}`,
        );
      }
      expect(
        m.charts.length === 4 && m.charts.every((c) => c !== 'none' && !/(^0x)|(x0$)/.test(c)),
        `${label}: ECharts canvases ${JSON.stringify(m.charts)}`,
      );
      expect(m.sankey.w > 0 && m.sankey.h > 0, `${label}: Sankey ${JSON.stringify(m.sankey)}`);
      // Too narrow for its labels left to right, the Sankey turns top to bottom.
      if (width < 600) expect(m.sankey.h > m.sankey.w, `${label}: Sankey not vertical on phone`);
      if (scheme === 'light') report.push(`${name}: ${JSON.stringify(m)}`);
      await page.screenshot({ path: `${OUT}/${name}-${scheme}.png`, fullPage: true });
      await page.close();
    }
  }

  // Dock: a section link scrolls its section to the top, marks it current, keeps the query.
  for (const [width, height] of [
    [390, 844],
    [1280, 800],
    [1920, 1080],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(origin + '?range=7d');
    await ready(page);
    await page.click('.dock a[href*="#flow"]');
    await page.waitForURL(`**${BASE}?range=7d#flow`);
    await settled(page);
    const top = await sectionTop(page, 'flow');
    expect(top >= 0 && top <= 60, `${width}: #flow lands at ${top}px`);
    const active = await page.evaluate(() =>
      document.querySelector('.dock [aria-current="location"]')?.getAttribute('aria-label'),
    );
    expect(active === 'Flow', `${width}: current section is ${active}`);
    await page.screenshot({ path: `${OUT}/dock-${width}.png` });

    // After a section link, a filter or a table click must leave the page where it is.
    // (The router once re-scrolled to #flow on every navigation that kept the fragment.)
    const stays = async (what, act, url) => {
      const before = await page.evaluate(() => Math.round(scrollY));
      await act();
      await page.waitForURL(url);
      await page.waitForTimeout(600);
      const after = await page.evaluate(() => Math.round(scrollY));
      expect(Math.abs(after - before) <= 2, `${width}: ${what} scrolled ${before} → ${after}`);
    };
    // Centred first: Playwright would otherwise scroll it out from under the phone's
    // bottom bar before clicking, which is the test moving the page, not the app.
    await page.evaluate(() =>
      document.querySelector('[aria-label="Next page"]').scrollIntoView({ block: 'center' }),
    );
    await page.waitForTimeout(300);
    await stays('next page', () => page.click('[aria-label="Next page"]'), /page=2/);
    await page.evaluate(() => scrollTo(0, 400));
    await page.waitForTimeout(300);
    await stays(
      'range filter',
      () => page.click('[role="radio"]:has-text("30 days")'),
      /range=30d/,
    );
    // Scrolled to the very end, the last section is current, though it can never reach the top.
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await settled(page);
    await page.waitForTimeout(200);
    const atEnd = await page.evaluate(() =>
      document.querySelector('.dock [aria-current="location"]')?.getAttribute('aria-label'),
    );
    expect(atEnd === 'Requests', `${width}: at the bottom the current section is ${atEnd}`);

    await page.close();

    // A shared link to a section opens at that section.
    const deep = await browser.newPage({ viewport: { width, height } });
    await deep.goto(origin + '?range=7d#requests');
    await ready(deep);
    await deep.waitForTimeout(600);
    const deepTop = await sectionTop(deep, 'requests');
    // Near the end of the page a section can only come as far as the page scrolls.
    const deepEnd = await deep.evaluate(
      () => scrollY + innerHeight >= document.documentElement.scrollHeight - 2,
    );
    expect(
      (deepTop >= 0 && deepTop <= 60) || deepEnd,
      `${width}: deep link #requests lands at ${deepTop}px`,
    );
    await deep.close();
  }

  const desk = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  // A search lands in the URL and survives a reload.
  await desk.goto(origin);
  await ready(desk);
  await desk.fill('.table-search input', 'notifications');
  await desk.waitForURL(`**${BASE}?q=notifications`);
  await desk.reload();
  await desk.waitForSelector('app-data-table tbody tr.row');
  const search = await desk.evaluate(() => ({
    value: document.querySelector('.table-search input').value,
    paths: [...document.querySelectorAll('app-data-table tbody tr.row td:nth-child(3)')].map((td) =>
      td.textContent.trim(),
    ),
  }));
  expect(search.value === 'notifications', `search: box shows "${search.value}" after reload`);
  expect(
    search.paths.length > 0 && search.paths.every((p) => p.includes('notifications')),
    `search: rows ${JSON.stringify(search.paths.slice(0, 3))}`,
  );

  // Demo states: the dock switch writes the URL; the URL opens the state; a section link keeps it.
  await desk.goto(origin);
  await ready(desk);
  await desk.click('.demo-trigger');
  await desk.waitForSelector('#demo-panel:popover-open');
  const panel = await desk.evaluate(() => {
    const el = document.querySelector('#demo-panel');
    const r = el.getBoundingClientRect();
    return {
      blur: getComputedStyle(el).backdropFilter,
      centre: Math.round(r.left + r.width / 2 - innerWidth / 2),
      bottom: Math.round(innerHeight - r.bottom),
    };
  });
  expect(panel.blur.includes('blur'), 'demo panel: not glass');
  report.push(`demo panel: ${JSON.stringify(panel)}`);
  await desk.screenshot({ path: `${OUT}/desktop-light-demo-panel.png` });
  await desk.click('#demo-panel label:has-text("Error")');
  await desk.waitForURL(`**${BASE}?demo=error`);
  const errorLabel = await desk
    .waitForFunction(
      () =>
        document.querySelector('.demo-trigger')?.getAttribute('aria-label') === 'Demo state: Error',
    )
    .then(
      () => true,
      () => false,
    );
  expect(errorLabel, 'demo: label not Error');
  await desk.keyboard.press('Escape');
  await desk.waitForTimeout(1000);
  await desk.screenshot({ path: `${OUT}/desktop-light-error.png`, fullPage: true });
  await desk.goto(origin + '?demo=empty');
  await desk.waitForFunction(
    () =>
      document.querySelector('.demo-trigger')?.getAttribute('aria-label') === 'Demo state: Empty',
  );
  await desk.click('.dock a[href*="#requests"]');
  await desk.waitForURL(`**${BASE}?demo=empty#requests`);
  expect(
    (await desk.getAttribute('.demo-trigger', 'aria-label')) === 'Demo state: Empty',
    'demo: state lost on a section link',
  );

  // Theme survives a reload.
  await desk.goto(origin);
  await desk.click('[aria-label="Toggle dark mode"]');
  await desk.reload();
  expect((await measure(desk)).dark, 'theme: not kept after reload');
  await desk.close();
} finally {
  await browser.close();
  server.close();
}

console.log(report.join('\n'));
console.log(`screenshots in ${OUT}`);
console.log(
  problems.length
    ? `PROBLEMS:\n${problems.join('\n')}`
    : 'no overflow, console errors, failed requests or layout mismatches',
);
process.exitCode = problems.length ? 1 : 0;
