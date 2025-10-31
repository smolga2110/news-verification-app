const express = require('express');
const cors = require('cors');
const Parser = require('rss-parser');

const app = express();
const parser = new Parser();

app.use(cors());
app.use(express.json());

const rssFeeds = [
  'https://lenta.ru/rss/news',
  'https://ria.ru/export/rss2/index.xml',
  'https://www.kommersant.ru/rss/news.xml',
  'https://tass.ru/rss/v2.xml',
  'https://www.vedomosti.ru/rss/news'
];

const tgPublics = [
    "Cbpub",
    "cb_economics",
    "toporlive",
    "mash",
    "rian_ru"
];

async function fetchTelegramWithFallback(pub){
    try{
        const result = await fetch(`https://localhost:3000/?action=display&bridge=TelegramBridge&username=%40${pub}&format=mrss`)
        if (result.ok){
            const xmlText = await result.text()
            const feed = await parser.parseString(xmlText)
            return {
                source: 'telegram',
                channel: pub,
                data: feed
            }
        }
        else{
            console.log(`Основной сервер вернул статус ${result.status}`)
        }
    }
    catch(error){
        console.error('Ошибка при получении данных:', error)
        console.log("Перехожу на запасной сервер")
        try{
            const result = await fetch(`https://rss-bridge.org/bridge01/?action=display&bridge=TelegramBridge&username=%40${pub}&format=mrss`)
            if (result.ok){
                const xmlText = await result.text()
                const feed = await parser.parseString(xmlText)
                return {
                    source: 'telegram',
                    channel: pub,
                    data: feed
                }
            }
            else{
                console.log(`Запасной сервер вернул статус ${result.status}`)
            }
        }
        catch (fallbackError){
            console.error("Запасной сервер также недоступен", fallbackError)
        }
    }
    return null
}

app.get('/api/news', async (req, res) => {
  try {
    const allNews = [];
    
    for (const feedUrl of rssFeeds) {
      try {
        const feed = await parser.parseURL(feedUrl);
        const newsItems = feed.items.map(item => ({
          title: item.title,
          link: item.link,
          content: item.contentSnippet || item.content,
          pubDate: item.pubDate,
          source: feed.title,
          sourceUrl: feedUrl,
          type: 'rss'
        }));
        allNews.push(...newsItems);
      } catch (error) {
        console.error(`Ошибка парсинга ${feedUrl}:`, error.message);
      }
    }

    for (const tgPub of tgPublics) {
      try {
        const telegramData = await fetchTelegramWithFallback(tgPub);
        if (telegramData && telegramData.data && telegramData.data.items) {
          const tgItems = telegramData.data.items.map(item => ({
            title: item.title,
            link: item.link,
            content: item.contentSnippet || item.content,
            pubDate: item.pubDate,
            source: `Telegram: ${tgPub}`,
            sourceUrl: `https://t.me/${tgPub}`,
            type: 'telegram'
          }));
          allNews.push(...tgItems);
        }
      } catch (error) {
        console.error(`Ошибка получения данных из Telegram ${tgPub}:`, error.message);
      }
    }
    
    allNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    
    res.json({
      success: true,
      count: allNews.length,
      news: allNews.slice(0, 100)
    });
    
  } catch (error) {
    console.error('Общая ошибка:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении новостей'
    });
  }
});

app.get('/api/telegram', async (req, res) => {
  try {
    const telegramNews = [];
    
    for (const tgPub of tgPublics) {
      const data = await fetchTelegramWithFallback(tgPub);
      if (data) {
        telegramNews.push(data);
      }
    }
    
    res.json({
      success: true,
      count: telegramNews.length,
      sources: telegramNews
    });
    
  } catch (error) {
    console.error('Ошибка получения Telegram данных:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении данных из Telegram'
    });
  }
});

app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Сервер работает!',
    endpoints: [
      '/api/news - Все новости (RSS + Telegram)',
      '/api/telegram - Только Telegram каналы',
      '/api/telegram/:channel - Конкретный Telegram канал'
    ]
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});