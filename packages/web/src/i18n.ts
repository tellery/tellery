import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import Backend from 'i18next-http-backend'
import { resources } from './locales'
export const languages: string[] = ['en-US', 'zh-CN']

console.log(resources)

i18n
  // .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // backend: {
    //   loadPath: '/locales/{{lng}}.json'
    // },
    resources: resources,
    fallbackLng: 'en-US',
    supportedLngs: languages,
    interpolation: {
      escapeValue: false
    }
  })
