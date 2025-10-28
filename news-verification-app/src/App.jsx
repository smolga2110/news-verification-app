import { useState, useEffect } from 'react'

function App() {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const API_URL = 'http://localhost:3000/api'

  useEffect(() => {
    fetchNews()
  }, [])

  const fetchNews = async () => {
    try {
      setError(null)
      const response = await fetch(`${API_URL}/news`)
      const data = await response.json()
      
      if (data.success) {
        setNews(data.news)
      } else {
        setError('Ошибка при загрузке новостей')
      }
    } catch (error) {
      console.error('Ошибка при загрузке новостей:', error)
      setError('Не удалось подключиться к серверу')
    } finally {
      setLoading(false)
    }
  }

  const getSourceColor = (source) => {
    const colors = {
      'Лента.ру': 'bg-blue-100 text-blue-800',
      'РИА Новости': 'bg-red-100 text-red-800',
      'Коммерсантъ': 'bg-green-100 text-green-800'
    }
    return colors[source] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка новостей...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                Проверка новостей РФ
              </h1>
              <p className="text-gray-600 mt-2">Сервис анализа достоверности новостей</p>
            </div>
            <button 
              onClick={fetchNews}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Обновить
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Статистика</h2>
              <p className="text-gray-600">Всего новостей: <span className="font-bold text-primary-600">{news.length}</span></p>
            </div>
            <div className="text-sm text-gray-500">
              Обновлено: {new Date().toLocaleTimeString('ru-RU')}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* News Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {news.map((item, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                {/* Source Badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSourceColor(item.source)}`}>
                    {item.source}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(item.pubDate).toLocaleDateString('ru-RU')}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-semibold text-gray-900 mb-3 line-clamp-2">
                  {item.title}
                </h3>

                {/* Content */}
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {item.content || 'Описание отсутствует'}
                </p>

                {/* Actions */}
                <div className="flex items-center justify-between gap-2">
                  <a 
                    href={item.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm transition-colors"
                  >
                    Читать
                  </a>
                  <button className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-3 py-2 rounded-lg text-sm transition-colors">
                    Проверить
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {news.length === 0 && !loading && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Новости не найдены</h3>
            <p className="text-gray-600">Попробуйте обновить страницу или проверьте подключение к серверу</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App