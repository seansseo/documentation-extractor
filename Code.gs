/**
 * Documentation Extractor
 *
 * A Google Apps Script web app that discovers and parses XML sitemaps
 * to extract documentation URLs from any website. Enter a domain or
 * sitemap URL, and the tool recursively crawls sitemap indexes, collects
 * every page URL, and lets you filter results by keyword.
 *
 * Author: Sean Seo
 * License: MIT
 */

/**
 * Serves the web page. This is the entry point for the web app.
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('Help Documentation URL Extractor')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Finds all sitemap URLs for a given input URL (domain or path).
 * This function is called first by the client.
 * @param {string} inputUrl The URL entered by the user.
 * @returns {string[]} An array of sitemap URLs found.
 */
function findSitemapsServer(inputUrl) {
  try {
    if (!inputUrl) {
      throw new Error("URL cannot be empty.");
    }
    // If the user enters a direct sitemap URL, just return that.
    if (inputUrl.toLowerCase().includes('.xml') || inputUrl.toLowerCase().includes('sitemap')) {
      return [inputUrl];
    }
    // Otherwise, search for sitemaps at the given path.
    let fullUrl = inputUrl.trim();
    if (!fullUrl.startsWith('http')) {
      fullUrl = `https://${fullUrl}`;
    }
    return findSitemapsHelper(fullUrl);
  } catch (e) {
    console.error(`Error in findSitemapsServer: ${e.message}`);
    throw new Error(e.message);
  }
}

/**
 * Processes a given list of sitemap URLs and returns all the page URLs found within.
 * This function is called second, after the user has selected which sitemap(s) to process.
 * @param {string[]} sitemapsToProcess An array of sitemap URLs to extract.
 * @returns {string[]} A de-duplicated array of all page URLs.
 */
function processSitemapsServer(sitemapsToProcess) {
  if (!sitemapsToProcess || sitemapsToProcess.length === 0) {
    return [];
  }
  const uniqueUrls = new Set();
  try {
    processAllSitemaps(sitemapsToProcess, uniqueUrls);
    return [...uniqueUrls];
  } catch (e) {
    console.error(`Error in processSitemapsServer: ${e.message}`);
    throw new Error(e.message);
  }
}

// --- HELPER FUNCTIONS ---

/**
 * Helper function that contains the exponential backoff logic for fetching and parsing sitemaps.
 */
function processAllSitemaps(sitemapUrls, uniqueUrlsSet) {
  if (!sitemapUrls || sitemapUrls.length === 0) {
    return;
  }
  const CHUNK_SIZE = 50;
  const nestedSitemapUrls = [];
  for (let i = 0; i < sitemapUrls.length; i += CHUNK_SIZE) {
    const chunk = sitemapUrls.slice(i, i + CHUNK_SIZE);
    const requests = chunk.map(url => ({ url: url, muteHttpExceptions: true }));
    let responses = null;
    let success = false;
    const MAX_ATTEMPTS = 5;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        responses = UrlFetchApp.fetchAll(requests);
        success = true;
        break;
      } catch (e) {
        if (e.message.includes('Service invoked too many times')) {
          const sleepTime = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          console.warn(`Quota limit hit. Retrying in ${Math.round(sleepTime / 1000)}s...`);
          Utilities.sleep(sleepTime);
        } else {
          throw e;
        }
      }
    }
    if (!success) {
      throw new Error('Failed to fetch a batch after multiple retries.');
    }
    responses.forEach(response => {
      if (response.getResponseCode() !== 200) return;
      try {
        const xmlDoc = XmlService.parse(response.getContentText());
        const root = xmlDoc.getRootElement();
        const namespace = root.getNamespace();
        const sitemaps = root.getChildren('sitemap', namespace);
        if (sitemaps.length > 0) {
          sitemaps.forEach(sitemap => {
            const loc = sitemap.getChild('loc', namespace);
            if (loc) nestedSitemapUrls.push(loc.getText());
          });
        } else {
          const urls = root.getChildren('url', namespace);
          urls.forEach(urlElement => {
            const loc = urlElement.getChild('loc', namespace);
            if (loc) uniqueUrlsSet.add(loc.getText());
          });
        }
      } catch (e) { /* Ignore parsing errors for single files */ }
    });
  }
  if (nestedSitemapUrls.length > 0) {
    processAllSitemaps(nestedSitemapUrls, uniqueUrlsSet);
  }
}

/**
 * Helper function to find sitemap URLs from robots.txt or a common path.
 */
function findSitemapsHelper(searchPath) {
  let cleanPath = searchPath;
  if (cleanPath.endsWith('/')) {
    cleanPath = cleanPath.slice(0, -1);
  }
  const robotsUrl = `${cleanPath}/robots.txt`;
  const sitemapUrls = [];
  try {
    const response = UrlFetchApp.fetch(robotsUrl, { muteHttpExceptions: true });
    if (response.getResponseCode() === 200) {
      const text = response.getContentText();
      const lines = text.split('\n');
      lines.forEach(line => {
        if (line.trim().toLowerCase().startsWith('sitemap:')) {
          const sitemapUrl = line.substring(line.indexOf(':') + 1).trim();
          if (sitemapUrl) sitemapUrls.push(sitemapUrl);
        }
      });
    }
  } catch (e) {
    console.warn(`Could not access robots.txt for ${robotsUrl}: ${e.message}`);
  }
  if (sitemapUrls.length === 0) {
    const commonSitemapUrl = `${cleanPath}/sitemap.xml`;
    const sitemapResponse = UrlFetchApp.fetch(commonSitemapUrl, { muteHttpExceptions: true });
    if (sitemapResponse.getResponseCode() === 200) {
      sitemapUrls.push(commonSitemapUrl);
    }
  }
  return sitemapUrls;
}