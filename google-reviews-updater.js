#!/usr/bin/env node

/**
 * Google Reviews Scraper für Hopkins Kanzlei
 * Scraped die Anzahl der Google-Bewertungen und aktualisiert die Webflow Variable
 * 
 * Usage:
 *   node google-reviews-updater.js
 * 
 * Environment Variables:
 *   WEBFLOW_API_KEY - Webflow API Token
 *   WEBFLOW_SITE_ID - Webflow Site ID
 *   WEBFLOW_PAGE_ID - Webflow Seiten-ID (optional für JSON-LD Update)
 */

const https = require('https');
const http = require('http');

// Konfiguration
const CONFIG = {
  googleUrl: 'https://www.google.com/storepages?q=hopkins.law&c=DE',
  webflowApiKey: process.env.WEBFLOW_API_KEY,
  webflowSiteId: process.env.WEBFLOW_SITE_ID,
  webflowPageId: process.env.WEBFLOW_PAGE_ID,
  variableCollectionId: process.env.WEBFLOW_VAR_COLLECTION_ID,
  variableName: 'googleReviewsCount'
};

// Utility: HTTP Request
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const client = options.protocol === 'https:' ? https : http;
    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve(body);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// 1. Google Reviews Scrapen (mit Cheerio/jsdom Alternative)
async function scrapeGoogleReviews() {
  console.log('🔍 Scraping Google Reviews...');
  
  try {
    const options = {
      hostname: 'www.google.com',
      path: '/storepages?q=hopkins.law&c=DE',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    const html = await makeRequest(options);
    
    // Regex zum Extrahieren der Review-Zahl
    // Sucht nach dem Pattern "2,661 reviews" oder ähnlich
    const reviewMatch = html.match(/(\d+,\d+|\d+)\s+reviews/i) || 
                       html.match(/"ratingCount"["\s:]*(\d+)/i) ||
                       html.match(/<span[^>]*>(\d+(?:,\d+)?)\s*review/i);
    
    if (!reviewMatch || !reviewMatch[1]) {
      throw new Error('Konnte Review-Zahl nicht extrahieren');
    }

    // Komma entfernen und zu Zahl konvertieren
    const reviewCount = parseInt(reviewMatch[1].replace(/,/g, ''));
    
    console.log(`✅ Google Reviews gefunden: ${reviewCount}`);
    return reviewCount;
  } catch (error) {
    console.error('❌ Fehler beim Scrapen:', error.message);
    throw error;
  }
}

// 2. Webflow Variable aktualisieren
async function updateWebflowVariable(reviewCount) {
  console.log(`📝 Updating Webflow Variable: ${reviewCount}...`);
  
  if (!CONFIG.webflowApiKey || !CONFIG.webflowSiteId || !CONFIG.variableCollectionId) {
    throw new Error('Fehlende Webflow Konfiguration: WEBFLOW_API_KEY, WEBFLOW_SITE_ID oder WEBFLOW_VAR_COLLECTION_ID');
  }

  try {
    // Zuerst: Variable auslesen (um ihre ID zu finden)
    const listOptions = {
      protocol: 'https:',
      hostname: 'api.webflow.com',
      path: `/v2/sites/${CONFIG.webflowSiteId}/variables?collection_ids=${CONFIG.variableCollectionId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CONFIG.webflowApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const listResponse = await makeRequest(listOptions);
    const variable = listResponse.variables?.find(v => v.name === CONFIG.variableName);
    
    if (!variable) {
      console.log(`⚠️  Variable "${CONFIG.variableName}" nicht gefunden. Erstelle sie...`);
      await createWebflowVariable(reviewCount);
      return;
    }

    // Variable aktualisieren
    const updateOptions = {
      protocol: 'https:',
      hostname: 'api.webflow.com',
      path: `/v2/sites/${CONFIG.webflowSiteId}/variables/${variable.id}`,
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${CONFIG.webflowApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const updateData = {
      value: {
        static_value: reviewCount
      }
    };

    await makeRequest(updateOptions, updateData);
    console.log(`✅ Variable erfolgreich aktualisiert: ${reviewCount}`);

  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren der Variable:', error.message);
    throw error;
  }
}

// 3. Webflow Variable erstellen (falls nicht vorhanden)
async function createWebflowVariable(reviewCount) {
  console.log(`🆕 Erstelle neue Variable "${CONFIG.variableName}"...`);

  const createOptions = {
    protocol: 'https:',
    hostname: 'api.webflow.com',
    path: `/v2/sites/${CONFIG.webflowSiteId}/variables`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.webflowApiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  const createData = {
    name: CONFIG.variableName,
    variable_collection_id: CONFIG.variableCollectionId,
    type: 'Number',
    value: {
      static_value: reviewCount
    }
  };

  await makeRequest(createOptions, createData);
  console.log(`✅ Variable erstellt mit Wert: ${reviewCount}`);
}

// 4. JSON-LD Schema in Webflow Seite aktualisieren
async function updateJsonLdSchema(reviewCount) {
  if (!CONFIG.webflowPageId) {
    console.log('⏭️  WEBFLOW_PAGE_ID nicht gesetzt - überspringe JSON-LD Update');
    return;
  }

  console.log('📄 Updating JSON-LD Schema...');

  try {
    // Bestehende JSON-LD auslesen
    const getOptions = {
      protocol: 'https:',
      hostname: 'api.webflow.com',
      path: `/v2/sites/${CONFIG.webflowSiteId}/pages/${CONFIG.webflowPageId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CONFIG.webflowApiKey}`,
        'Accept': 'application/json'
      }
    };

    const pageData = await makeRequest(getOptions);
    let jsonLdSchema = pageData.json_ld_schema ? JSON.parse(pageData.json_ld_schema) : {};

    // Stelle sicher, dass es ein Organization/LocalBusiness Schema ist
    if (!jsonLdSchema['@context']) {
      jsonLdSchema = {
        '@context': 'https://schema.org/',
        '@type': 'LocalBusiness',
        name: 'Hopkins Kanzlei',
        url: 'https://hopkins.law'
      };
    }

    // Update aggregateRating mit neuer Review-Anzahl
    jsonLdSchema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: '4.8', // ändere je nach deinen Google-Bewertungen
      reviewCount: reviewCount
    };

    // JSON-LD aktualisieren
    const updateOptions = {
      protocol: 'https:',
      hostname: 'api.webflow.com',
      path: `/v2/sites/${CONFIG.webflowSiteId}/pages/${CONFIG.webflowPageId}`,
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${CONFIG.webflowApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const updateData = {
      json_ld_schema: JSON.stringify(jsonLdSchema)
    };

    await makeRequest(updateOptions, updateData);
    console.log(`✅ JSON-LD Schema aktualisiert mit ${reviewCount} Reviews`);

  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren der JSON-LD:', error.message);
    // Nicht als kritischer Fehler behandeln - Variable ist wichtiger
  }
}

// Hauptfunktion
async function main() {
  try {
    console.log('🚀 Google Reviews Auto-Updater startet...\n');

    // 1. Reviews scrapen
    const reviewCount = await scrapeGoogleReviews();

    // 2. Variable aktualisieren
    await updateWebflowVariable(reviewCount);

    // 3. JSON-LD aktualisieren (optional)
    await updateJsonLdSchema(reviewCount);

    console.log('\n✨ Alle Aktualisierungen erfolgreich abgeschlossen!');
    process.exit(0);

  } catch (error) {
    console.error('\n💥 Fehler beim Ausführen:', error.message);
    process.exit(1);
  }
}

main();
