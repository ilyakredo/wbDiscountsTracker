export async function updatePrice(nmID, newPrice, discount, apiKey) {
    const API_URL = "https://discounts-prices-api.wildberries.ru/api/v2/upload/task";
    const data = {
        data: [
            {
                "nmID": Number(nmID),
                "price": Number(Math.round(newPrice)),
                "discount": Number(discount)
            }
        ]
    };

    const headers = {
        "Content-Type": "application/json",
        "Authorization": apiKey
    };

    const MAX_RETRIES = 10;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: headers,
                body: JSON.stringify(data)
            });

            // Проверяем статус до парсинга
            if (response.status === 429) {
                const waitTime = 500 * attempt;
                console.log(`\x1b[33mПревышен лимит запросов, повтор через ${waitTime} мс (попытка ${attempt}/${MAX_RETRIES})\x1b[0m`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }

            // Пробуем распарсить JSON, даже если статус не 200
            let result;
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                result = await response.json();
            } else {
                const text = await response.text();
                return `Некорректный ответ от API (${response.status}): ${text}`;
            }

            if (!response.ok) {
                if (result?.errorText === "The specified prices and discounts are already set") {
                    return `Цена уже установлена (${newPrice})`;
                }
                return `Ошибка запроса: ${response.status} - ${response.statusText}`;
            }

            // console.log(`Замена цены - \x1b[32m${newPrice}\x1b[0m`);
            return `Замена цены - ${newPrice}`;
        } catch (error) {
            // Можно добавить задержку и повтор при сетевой ошибке
            const waitTime = 500 * attempt;
            console.log(`\x1b[31mОшибка сети, повтор через ${waitTime} мс (попытка ${attempt}/${MAX_RETRIES})\x1b[0m`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }

    return "Ошибка: превышено количество попыток обновления цены (429 Too Many Requests или другие ошибки)";
}