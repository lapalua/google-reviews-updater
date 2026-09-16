const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const URL = 'https://www.google.com/storepages?q=hopkins.law&c=DE';
const OUTPUT_PATH = path.join(__dirname, '..', 'reviews.json');

async function acceptCookiesIfPresent(page) {
  const selectors = [
    'button[aria-label="Alle akzeptieren"]',
    'button[aria-label="Accept all"]',
    'form[action*="consent"] button',
  ];
  for (const selector of selectors) {
    try {
      const btn = await page.$(selector);
      if (btn) {
        await btn.click();
        await page
          .waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 })
          .catch(() => {});
        return;
      }
    } catch (e) {
      // nächsten Selector versuchen
    }
  }
}

function parseReviewCount(text) {
  if (!text) return null;
  const digits = text.replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : null;
}

async function scrape() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/124.0 Safari/537.36'
    );
    await page.setViewport({ width: 1280, height: 900 });

    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await acceptCookiesIfPresent(page);

    await page.waitForSelector('.TR8uT-NnAfwf, .dXIow-NnAfwf', {
      timeout: 15000,
    });

    const rawText = await page.evaluate(() => {
      const el =
        document.querySelector('.TR8uT-NnAfwf') ||
        document.querySelector('.dXIow-NnAfwf');
      return el ? el.textContent.trim() : null;
    });

    const reviewCount = parseReviewCount(rawText);

    if (reviewCount === null) {
      throw new Error(
        `Konnte Bewertungsanzahl nicht aus Text extrahieren: "${rawText}"`
      );
    }

    const data = {
      reviewCount,
      reviewCountText: rawText,
      sourceUrl: URL,
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2) + '\n');
    console.log('reviews.json aktualisiert:', data);
  } finally {
    await browser.close();
  }
}

scrape().catch((err) => {
  console.error('Scraping fehlgeschlagen:', err);
  process.exit(1);
});
