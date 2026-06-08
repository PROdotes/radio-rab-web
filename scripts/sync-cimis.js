/**
 * Radio Rab — CIMIS Port Visits Scraper
 * This script scrapes arrivals and departures from the Croatian Integrated 
 * Maritime Information System (CIMIS) for Rab island ports.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function scrapeCimis() {
    console.log('--- Starting CIMIS Scraper ---');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    // Set a longer timeout for the slow Oracle APEX portal
    page.setDefaultTimeout(30000);

    try {
        console.log('Navigating to CIMIS Landing Page...');
        await page.goto('https://cimis.pomorstvo.hr/ords/f?p=100:20', { waitUntil: 'networkidle' });

        // Check if we are on the login page and click 'Javni sadržaj'
        const publicBtn = page.locator('button:has-text("Javni sadržaj")');
        if (await publicBtn.count() > 0) {
            console.log('Clicking "Javni sadržaj CIMIS portala"...');
            await publicBtn.click();
        }

        console.log('Waiting for visits table to load...');
        await page.waitForSelector('.a-IRR-table', { timeout: 45000 });
        await page.waitForTimeout(5000);

        // 1. Sort by Dolazak Descending
        console.log('Setting sort order to Dolazak Descending...');
        try {
            const dolazakHeader = page.locator('th a.a-IRR-headerLink:has-text("Dolazak")');
            await dolazakHeader.click();
            await page.waitForSelector('.a-IRR-sortWidget', { visible: true, timeout: 5000 });
            const sortDescBtn = page.locator('button.a-IRR-sortWidget-button[aria-label="Sortiraj silazno."]');
            await sortDescBtn.click();
            await page.waitForTimeout(3000); // Wait for AJAX refresh
        } catch (e) {
            console.log('Failed to sort by Dolazak:', e.message);
        }

        // 2. Set Rows Per Page to 50
        console.log('Setting rows per page to 50...');
        try {
            await page.click('button.a-IRR-button--actions');
            await page.waitForSelector('.a-IRR-menu', { visible: true, timeout: 5000 });

            const rowsOption = page.locator('.a-Menu-label:has-text("Broj redaka po stranici")');
            await rowsOption.click(); // Click instead of hover for better menu activation
            await page.waitForTimeout(1500);

            // Submenu shows up as another top-level div usually
            const fiftyOption = page.locator('.a-Menu-label:has-text("50")').first();
            await fiftyOption.click();
            await page.waitForTimeout(3000);
        } catch (e) {
            console.log('Failed to set rows per page:', e.message);
        }

        const ports = ['Mišnjak', 'Stinica', 'Lopar', 'Valbiska', 'Rab'];
        const allVisits = [];

        for (const port of ports) {
            console.log(`\nFiltering for port: ${port}...`);

            // Clear existing filter chips (the "X" buttons) - ALWAYS do this
            let removeButtons = await page.$$('button.a-IRR-button--remove');
            while (removeButtons.length > 0) {
                console.log(`Clearing ${removeButtons.length} old filters...`);
                await page.click('button.a-IRR-button--remove');
                await page.waitForTimeout(2000); // Wait for AJAX
                removeButtons = await page.$$('button.a-IRR-button--remove');
            }

            // Focus search field
            const searchField = page.locator('input.a-IRR-search-field');
            await searchField.fill(port);
            await searchField.press('Enter');

            // Wait for table update
            console.log('Waiting for table update...');
            await page.waitForTimeout(5000);

            console.log(`Extracting data for ${port}...`);
            const rows = await page.$$eval('.a-IRR-table tbody tr', (trElements) => {
                return trElements.map(tr => {
                    const cells = Array.from(tr.querySelectorAll('td'));
                    if (cells.length < 5) return null;

                    const item = {};
                    cells.forEach(td => {
                        const headers = td.getAttribute('headers');
                        if (headers) {
                            item[headers] = td.innerText.trim();
                        }
                    });
                    return item;
                }).filter(i => i !== null);
            });

            if (rows.length > 0) {
                console.log(`Debug: First row found: ${rows[0]['Luka']} / ${rows[0]['Pomorski objekt']}`);
            } else {
                console.log('No rows found in table!');
                await page.screenshot({ path: `data/debug-${port}.png` });
            }

            // Specific filter: The 'Luka' column MUST contain our target port
            const matchedRows = rows.filter(r => {
                const portVal = (r['Luka'] || '').toLowerCase();
                // Special case: 'Rab' should not match 'Rabac'
                if (port.toLowerCase() === 'rab') {
                    const words = portVal.split(/[\s,()]+/);
                    return words.includes('rab');
                }
                return portVal.includes(port.toLowerCase());
            });

            console.log(`Found ${matchedRows.length} matched records for ${port}`);
            allVisits.push(...matchedRows);
        }

        // Deduplicate and Sort
        const uniqueVisits = [];
        const seen = new Set();

        for (const v of allVisits) {
            const key = `${v['Pomorski objekt']}|${v['Luka']}|${v['Dolazak']}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueVisits.push(v);
            }
        }

        // Sort by Dolazak (Arrival) descending - format: DD.MM.YYYY HH:mm
        uniqueVisits.sort((a, b) => {
            const parseDate = (dStr) => {
                if (!dStr || dStr === '-') return new Date(0);
                const [date, time] = dStr.split(' ');
                const [d, m, y] = date.split('.');
                return new Date(`${y}-${m}-${d}T${time}`);
            };
            return parseDate(b['Dolazak']) - parseDate(a['Dolazak']);
        });

        const finalVisits = uniqueVisits.slice(0, 50); // Keep top 50 recents

        const outputPath = path.join(__dirname, '../data/cimis-visits.json');
        const data = {
            timestamp: new Date().toISOString(),
            source: 'CIMIS Public Portal',
            count: finalVisits.length,
            visits: finalVisits
        };

        fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
        console.log(`\nSUCCESS: Saved ${finalVisits.length} unique visits to ${outputPath}`);

    } catch (err) {
        console.error('\nERROR during CIMIS scraping:');
        console.error(err);

        // Take a screenshot for debugging if it failed
        try {
            const errorPath = path.join(__dirname, '../data/cimis-error.png');
            await page.screenshot({ path: errorPath });
            console.log(`Error screenshot saved to ${errorPath}`);
        } catch (e) { }

        process.exit(1);
    } finally {
        await browser.close();
    }
}

scrapeCimis();
