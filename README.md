# Documentation Extractor

A Google Apps Script web app that extracts URLs from any website's XML sitemaps.

## Background

I built this tool to solve a recurring problem at work: collecting hundreds of documentation URLs from large help sites for content audits and migration projects. Rather than clicking through sitemaps by hand, I wanted something that could crawl them automatically and let me filter the results. This script became the foundation for [DocWeb](https://your-portfolio-url.com/blog/from-script-to-saas), a more fully featured sitemap extraction and chatbot platform.

## What It Does

- **Sitemap discovery** -- finds sitemaps via `robots.txt` or the common `/sitemap.xml` path
- **Recursive parsing** -- follows sitemap index files to extract nested sitemaps
- **Batch fetching** -- processes URLs in chunks of 50 with exponential-backoff retry
- **Keyword filtering** -- include/exclude filters with a tag-bubble UI so you can narrow results in real time
- **One-click copy** -- copies the filtered URL list to your clipboard

## How It Works

The app has a two-phase flow:

1. **Find sitemaps** -- Enter a domain (e.g., `cloud.google.com`) or a direct sitemap URL. The backend checks `robots.txt` for `Sitemap:` directives, falling back to `/sitemap.xml`.
2. **Process sitemaps** -- Select one or more discovered sitemaps. The backend recursively fetches and parses every sitemap index and URL set, deduplicates the results, and returns them to the frontend where you can filter by keyword.

The backend (`Code.gs`) runs on Google Apps Script using `UrlFetchApp` and `XmlService`. The frontend (`Index.html`) is a single-page HTML/JS app served by `HtmlService`.

## Tech Stack

- Google Apps Script (server-side JavaScript)
- HTML5 / vanilla JavaScript
- Tailwind CSS (via CDN)
- XML sitemap parsing (`XmlService`)

## Setup

1. Go to [script.google.com](https://script.google.com) and create a new project.
2. Replace the default `Code.gs` with the contents of `Code.gs` from this repo.
3. Create a new HTML file named `Index.html` and paste the contents of `Index.html`.
4. Click **Deploy > New deployment**, choose **Web app**, and set access to your preference.
5. Open the deployment URL in your browser.

## Usage

1. Enter a website domain (e.g., `example.com`) or a direct sitemap URL.
2. Click **Extract URLs**. The tool searches for sitemaps at that domain.
3. If multiple sitemaps are found, select which ones to process or click **Process All**.
4. Once extraction completes, use the **Include Keywords** and **Exclude Keywords** fields to filter results (press Enter to add each keyword).
5. Click **Copy All Links** to copy the filtered URLs to your clipboard.

## License

[MIT](LICENSE)
