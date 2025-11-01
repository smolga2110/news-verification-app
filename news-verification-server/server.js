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

function normalizeText(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\sа-яё]/gi, ' ')
        .replace(/\s+/g, ' ') 
        .trim()
        .substring(0, 200);
}

function createNewsKey(newsItem) {
    const titleKey = normalizeText(newsItem.title);
    const contentKey = normalizeText(newsItem.content || '').substring(0, 100);
    return `${titleKey}_${contentKey}`;
}

function isSameNews(news1, news2, threshold = 0.6) {
    const key1 = createNewsKey(news1);
    const key2 = createNewsKey(news2);
    
    if (key1 === key2) return true;
    
    const words1 = key1.split(' ');
    const words2 = key2.split(' ');
    
    const commonWords = words1.filter(word => 
        word.length > 3 && words2.includes(word)
    );
    
    const similarity = commonWords.length / Math.max(words1.length, words2.length);
    return similarity > threshold;
}

function groupSimilarNews(newsItems) {
    const groups = [];
    
    for (const news of newsItems) {
        let foundGroup = false;
        
        for (const group of groups) {
            if (isSameNews(group.original, news)) {
                group.sources.push({
                    source: news.source,
                    sourceUrl: news.sourceUrl,
                    type: news.type,
                    publishedAt: news.pubDate,
                    originalTitle: news.title,
                    originalLink: news.link
                });
                
                if (new Date(news.pubDate) < new Date(group.earliestPubDate)) {
                    group.earliestPubDate = news.pubDate;
                }
                
                foundGroup = true;
                break;
            }
        }
        
        if (!foundGroup) {
            groups.push({
                id: createNewsKey(news), 
                title: news.title,
                content: news.content,
                link: news.link,
                earliestPubDate: news.pubDate,
                original: news, 
                sources: [{
                    source: news.source,
                    sourceUrl: news.sourceUrl,
                    type: news.type,
                    publishedAt: news.pubDate,
                    originalTitle: news.title,
                    originalLink: news.link
                }]
            });
        }
    }
    
    return groups;
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
          content: item.contentSnippet || item.content || '',
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
            content: item.contentSnippet || item.content || '',
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
    
    const groupedNews = groupSimilarNews(allNews);
    
    groupedNews.sort((a, b) => new Date(b.earliestPubDate) - new Date(a.earliestPubDate));
    
    res.json({
      success: true,
      count: groupedNews.length,
      totalSources: allNews.length,
      news: groupedNews.slice(0, 100)
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
      '/api/news - Все новости',
      '/api/telegram - Только Telegram каналы',
    ]
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});