/**
 * @fileoverview HTTP API layer for the ConnectBox React icon client.
 *
 * Wraps axios for all network calls made by the app. Exported functions
 * cover content browsing, stats, chat, and admin property get/set.
 * Private helpers (get, post, put) attach Authorization headers and
 * normalise TIMEOUT / NETWORK_ERROR error types so sagas can branch on
 * err.errorType without parsing raw error messages.
 */

import axios from 'axios'

/**
 * Post a chat message to the server.
 * @param {Object} params
 * @param {string} params.message - Message body text.
 */
export function postMessage (params = {}) {
  const {message} = params
  return post(`/chat/messages`, message)
}

/**
 * Fetch chat messages, optionally requesting only messages newer than max_id.
 * @param {Object} params
 * @param {number|null} params.max_id - If set, return only messages with id > max_id.
 */
export function getMessages (params = {}) {
  const {max_id = null} = params
  if (max_id) {
    return get(`/chat/messages?max_id=${max_id}`)
  } else {
    return get(`/chat/messages`)
  }
}

/**
 * Fetch the server's preferred text direction (ltr/rtl) for chat messages.
 */
export function getDefaultTextDirection () {
  return get('/chat/messages/textDirection')
}

/**
 * Fetch directory listing for the given content path.
 * @param {Object} params
 * @param {string} params.contentPath - URL path segment under /content/.
 */
export function getContent (params = {}) {
  const {contentPath} = params
  return get(`/content/${contentPath}/`)
}

/**
 * Fetch the app's JSON config file from an arbitrary URL.
 * @param {Object} params
 * @param {string} params.configPath - Full URL (usually PUBLIC_URL/config/default.json).
 */
export function getConfig (params = {}) {
  const {configPath} = params
  return get(configPath)
}

/**
 * Fetch the stats JSON file from an arbitrary URL.
 * @param {Object} params
 * @param {string} params.statsPath - Full URL to the stats file.
 */
export function getStats (params = {}) {
  const {statsPath} = params
  return get(statsPath, {})
}

/**
 * Read a single named property from the connectbox-manage admin API.
 * @param {Object} params
 * @param {string} params.authorization - Basic auth header value.
 * @param {string} params.propertyName - Property key as used in the API route.
 */
export function getProperty (params = {}) {
  const {authorization, propertyName} = params
  return get(`api/${propertyName}`, authorization)
}

/**
 * Write a named property to the connectbox-manage admin API.
 * @param {Object} params
 * @param {string} params.authorization - Basic auth header value.
 * @param {string} params.propertyName - Property key as used in the API route.
 * @param {*}      params.propertyValue - New value.
 * @param {boolean} params.wrap - When true, sends {value: propertyValue}; otherwise sends the value directly.
 * @param {number}  params.timeout - Request timeout in ms.
 */
export function setProperty (params = {}) {
  const {authorization, propertyName, propertyValue, wrap, timeout} = params
  return put(`api/${propertyName}`, wrap ? {value: propertyValue} : propertyValue, authorization, timeout)
}

/**
 * POST an event type to a named property endpoint (used for one-shot actions like reboot).
 * @param {Object} params
 * @param {string} params.authorization - Basic auth header value.
 * @param {string} params.propertyName - Target API route key.
 * @param {string} params.eventType - Event type string sent as {value: eventType}.
 */
export function triggerEvent (params = {}) {
  const {authorization, propertyName, eventType} = params
  return post(`api/${propertyName}`, {value: eventType}, authorization)
}

/**
 * Internal GET helper. Attaches Authorization header and optional timeout.
 * Returns defaultValue on error if provided, otherwise re-throws.
 * @param {string} url
 * @param {string} [authorization]
 * @param {*}      [defaultValue] - Returned on catch instead of throwing.
 * @param {number} [timeout] - Request timeout in ms.
 */
function get (url, authorization, defaultValue, timeout) {
  let config = {}
  if (timeout) {
    config.timeout = timeout
  }
  if (authorization) {
    config.headers = {
      Authorization: authorization
    }
  }
  return axios.get(url, config).then(resp => resp).catch(e => {
    if (defaultValue) {
      return defaultValue
    }
    throw e
  })
}

/**
 * Internal POST helper. Attaches Authorization header and optional timeout.
 * Tags TIMEOUT and NETWORK_ERROR on thrown errors for saga branching.
 * @param {string} url
 * @param {*}      body - Request payload.
 * @param {string} [authorization]
 * @param {number} [timeout] - Request timeout in ms.
 */
function post (url, body, authorization, timeout) {
  let config = {}
  if (timeout) {
    config.timeout = timeout
  }
  if (authorization) {
    config.headers = {
      Authorization: authorization
    }
  }
  return axios.post(url, body, config).then(resp => resp.data).catch(e => {
    if (e.message.startsWith('timeout of')) {
      e.errorType = 'TIMEOUT'
    } else if (e.message === 'Network Error') {
      e.errorType = 'NETWORK_ERROR'
    }
    throw e
  })
}

/**
 * Internal PUT helper. Mirrors post() error tagging.
 * Uses async/await instead of promise chains for clarity.
 * @param {string} url
 * @param {*}      body - Request payload.
 * @param {string} [authorization]
 * @param {number} [timeout] - Request timeout in ms.
 */
async function put (url, body, authorization, timeout) {
  let config = {}
  if (timeout) {
    config.timeout = timeout
  }
  if (authorization) {
    config.headers = {
      Authorization: authorization
    }
  }
  try {
    return await axios.put(url, body, config)
  } catch (e) {
    if (e.message.startsWith('timeout of')) {
      e.errorType = 'TIMEOUT'
    } else if (e.message === 'Network Error') {
      e.errorType = 'NETWORK_ERROR'
    }
    throw e
  }
}
