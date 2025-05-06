const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Состояние игры
let gameState = {
    multiplier: 'x1.00', // Текущий коэффициент
    lastMultiplier: 'x1.00', // Предыдущий коэффициент для сравнения
    hasChanged: false // Флаг изменения коэффициента
};

// Функция для извлечения коэффициента
async function scrapeMultiplier(page) {
    try {
        await page.goto('https://1wine.life/lasttime', { waitUntil: 'networkidle2' });

        const multiplierText = await page.evaluate(() => {
            return document.body.textContent.trim();
        });

        const cleanText = multiplierText.replace('x', '').trim();
        const multiplierValue = parseFloat(cleanText);

        if (isNaN(multiplierValue)) {
            throw new Error('Не удалось распарсить коэффициент: ' + multiplierText);
        }

        return `x${multiplierValue.toFixed(2)}`;
    } catch (error) {
        console.error('Ошибка при извлечении коэффициента:', error);
        return 'x1.00';
    }
}

// Функция для обновления состояния
async function updateGameState() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        while (true) {
            const newMultiplier = await scrapeMultiplier(page);

            // Проверяем, изменился ли коэффициент
            if (newMultiplier !== gameState.lastMultiplier) {
                gameState.hasChanged = true; // Коэффициент изменился
                gameState.multiplier = newMultiplier;
                gameState.lastMultiplier = newMultiplier;
            }

            console.log(`Состояние игры: ${JSON.stringify(gameState)}`);
            await new Promise(resolve => setTimeout(resolve, 500)); // Обновляем каждые 0.5 секунды
        }
    } catch (error) {
        console.error('Ошибка обновления состояния:', error);
    } finally {
        await browser.close();
    }
}

// Запускаем обновление состояния
updateGameState();

// API-эндпоинт для получения состояния
app.get('/game-state', (req, res) => {
    const stateToSend = { ...gameState };
    gameState.hasChanged = false; // Сбрасываем флаг после отправки
    res.json(stateToSend);
});

app.listen(port, () => {
    console.log(`Бэкенд запущен на http://localhost:${port}`);
});
