import { updatePrice } from './api.js';
import { getActualPrice } from './scraper.js';
import XLSX from 'xlsx';
import fs from 'fs';
import schedule from 'node-schedule';
const products = JSON.parse(fs.readFileSync('./products.json', 'utf-8'));
const PRICE_START = 291.01;
const PRICE_END = 611.01;
const PRICE_STEP = 10;
const sellerDiscount = 0;
const apiKey = "eyJhbGciOiJFUzI1NiIsImtpZCI6IjIwMjUwMjE3djEiLCJ0eXAiOiJKV1QifQ.eyJlbnQiOjEsImV4cCI6MTc1ODY3OTA1MSwiaWQiOiIwMTk1Y2Q5OC0xNjY0LTc3NDAtOTJjOS0wZDdhM2RmYjkyNWEiLCJpaWQiOjE1Mzg3NTEyNywib2lkIjo0MTIxNzU0LCJzIjoyNCwic2lkIjoiMjQ4OWViMDctMzBlZi00ZDg2LWIzMzYtNWEyMWU2N2M2MTNiIiwidCI6ZmFsc2UsInVpZCI6MTUzODc1MTI3fQ.36cXvj2mGGWC_i8_XGDV89-skf8uN0wi9G9gkuHPXDyFaxOZYch3DF7BHQadsoj8K4TMAIzBS8-0QsSX-96FGw";

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function restoreStartPrice(nmID, discount, apiKey) {
    const prices = [510, 410, 310, 291.01];

    let lastResult = null;

    for (let price of prices) {
        console.log(`⏳ Установка цены ${price} для товара ${nmID}...`);
        await delay(5000);
        lastResult = await updatePrice(nmID, price, discount, apiKey);
    }

    return prices[prices.length - 1]; // вернём 250 как "итоговую" цену
}

async function restoreStartPriceAllProducts() {
    const discount = 0;

    const results = await Promise.all(
        products.map(async (product, index) => {
            const { productId } = product;

            console.log(`🟡 [${index + 1}] Обработка товара ${productId}...`);

            const correctStartPrice = await restoreStartPrice(productId, discount, apiKey);

            console.log(`✅ [${index + 1}] Товар ${productId}, Стартовая цена: ${correctStartPrice}\n`);
            return { productId, correctStartPrice };
        })
    );

    console.log('🎉 Все товары обработаны!');
    console.table(results);
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testProduct(product) {
    const { productId, productUrl } = product;
    let lastDiscount = null;
    const foundDiscounts = [];

    for (let price = PRICE_START; price <= PRICE_END; price += PRICE_STEP) {
        // price = price + 0.01;
        console.log(`🔄 ${productId} — Устанавливаем цену: ${price}`);
        
        const priceUpdateRes = await updatePrice(productId, price, sellerDiscount, apiKey);
        await sleep(3000 + Math.random() * 2000);

        const actualPrice = await getActualPrice(productUrl);
        if (!actualPrice) continue;

        const discount = Math.round(100 - (actualPrice / price) * 100);

        console.log(`📊 Цена: ${price}, С сайта: ${actualPrice}, Скидка: ${discount}%`);

        if (discount !== lastDiscount) {
            console.log(`⚠️ Граница скидки найдена: ${price} — ${discount}%`);
            foundDiscounts.push({ productId, price, discount, actualPrice });
            lastDiscount = discount;
        }
    }

    return foundDiscounts;
}

function saveResultsToExcel(allResults) {
    const flatData = allResults.flat();

    const sheetData = [
        ['Product ID', 'Test Price', 'Actual Price', 'Discount', 'Time'],
        ...flatData.map(r => [
            r.productId,
            r.price,
            r.actualPrice,
            r.discount + '%',
            new Date().toLocaleString(),
        ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Discount Check');

    const filename = `discount_results_${new Date().toISOString().slice(0, 13).replace(/:/g, '-')}.xlsx`;
    XLSX.writeFile(wb, `./results/${filename}`);

    console.log(`✅ Результаты сохранены в ./results/${filename}`);
}

async function runAnalysis() {
    console.log(`\n🚀 Запуск анализа скидок — ${new Date().toLocaleString()}`);

    const allResults = await Promise.all(products.map(p => testProduct(p)));

    saveResultsToExcel(allResults);

    await restoreStartPriceAllProducts()
}

// Создаём папку results если нет
if (!fs.existsSync('./results')) fs.mkdirSync('./results');

// Запускаем при старте
await runAnalysis();

// ⏰ Повторяем каждый час
schedule.scheduleJob('0 * * * *', async () => {
    await runAnalysis();
});