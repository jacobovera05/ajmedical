import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Polyfill window.storage using localStorage for persistence
window.storage = {
  async get(key) {
    try {
      const val = localStorage.getItem(key)
      if (val === null) throw new Error('Key not found')
      return { key, value: val, shared: false }
    } catch (e) {
      throw e
    }
  },
  async set(key, value, shared = false) {
    try {
      localStorage.setItem(key, value)
      return { key, value, shared }
    } catch (e) {
      console.error('Storage set error:', e)
      return null
    }
  },
  async delete(key, shared = false) {
    try {
      localStorage.removeItem(key)
      return { key, deleted: true, shared }
    } catch (e) {
      return null
    }
  },
  async list(prefix = '', shared = false) {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix))
      return { keys, prefix, shared }
    } catch (e) {
      return { keys: [], prefix, shared }
    }
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
