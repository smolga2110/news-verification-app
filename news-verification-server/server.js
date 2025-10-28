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
          sourceUrl: feedUrl
        }));
        allNews.push(...newsItems);
      } catch (error) {
        console.error(`Ошибка парсинга ${feedUrl}:`, error.message);
      }
    }
    
    allNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    
    res.json({
      success: true,
      news: allNews.slice(0, 50)
    });
    
  } catch (error) {
    console.error('Общая ошибка:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении новостей'
    });
  }
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'Сервер работает!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});