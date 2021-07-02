module.exports = {
  redis: {
    url: process.env.REDIS_URL,
  },
  postgres: {
    searchLanguage: process.env.PG_SEARCH_LANGUAGE || 'zh_cn',
    searchPlugin: process.env.PG_SEARCH_PLUGIN || 'zhparser',
  },
  server: {
    host: 'tellery.io',
  },
}
