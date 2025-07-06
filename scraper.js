import puppeteer from 'puppeteer';

export async function getActualPrice(url) {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    try {
        try {
            await page.waitForSelector("delay-7sec", { timeout: 7000 });
        } catch (error) {}

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });

        try {
            await page.waitForSelector("delay-3sec", { timeout: 3000 });
        } catch (error) {}

        try {
            await page.waitForSelector("ins.price-block__final-price", { timeout: 8001 });
        } catch (error) {}

        const price = await page.evaluate(() => {
            const el = document.querySelector('.price-block__final-price');
            return el ? parseFloat(el.textContent.replace(/\D/g, '')) : null;
        });

        await browser.close();

        return price;
    } catch (e) {

        await browser.close();

        console.error(`❌ Не удалось получить цену с ${url}`, e);
        
        return null;
    }
}