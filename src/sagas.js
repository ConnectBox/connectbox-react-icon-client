/**
 * @fileoverview Redux-saga side-effect handlers for the ConnectBox React icon client.
 *
 * Each generator function handles one async workflow: authentication, content
 * fetching, chat, admin property read/write, and nick/text-direction persistence.
 * The root saga mySaga() wires all handlers via takeLatest / takeEvery so that
 * only the most recent content/message fetch is in flight at any time while
 * property writes can overlap.
 *
 * Key behaviours:
 * - performSetProperty: on TIMEOUT, enters a polling loop retrying getProperty
 *   until the value matches or (requestTimeout + maxWait) is exceeded.
 * - performTriggerEvent: treats NETWORK_ERROR as success because mobile devices
 *   often drop the connection when a network-resetting event fires.
 * - fetchContent: lazily loads config on first content fetch, then fetches stats
 *   only on the root path and only if popularFiles has not yet been loaded.
 */

import { get } from 'lodash'
import { generateNick } from './utils'
import { delay } from 'redux-saga'
import {
  call,
  put,
  takeEvery,
  takeLatest,
  select } from 'redux-saga/effects'
import {
  getContent,
  getConfig,
  getMessages,
  getStats,
  getDefaultTextDirection,
  getProperty,
  setProperty,
  triggerEvent,
  postMessage } from './api'

const checkNeedsConfig = (state) => state.needsConfig
const getConfigPath = (state) => state.configPath
const getConfigFromStore = (state) => state.config
const getPopularFiles = (state) => state.popularFiles
const getMaxMessageId = (state) => state.maxMessageId
const getAuthorization = (state) => state.authorization

/**
 * Handle AUTHENTICATE_REQUESTED.
 * Builds a Basic-auth header from the given password, calls getProperty('ui-config')
 * to verify credentials, and dispatches AUTHENTICATE_SUCCEEDED (stores authorization
 * in localStorage) or AUTHENTICATE_FAILED accordingly.
 */
function * performAuthenticate (action) {
  yield put({type: 'AUTHENTICATE_START'})
  try {
    const { password } = action.payload
    const encoded = new Buffer(`admin:${password}`).toString('base64')
    const authorization = `Basic ${encoded}`
    const res = yield call(getProperty, {propertyName: 'ui-config', authorization})
    const version = get(res, 'headers.x-connectbox-version', 'unknown')
    const { code } = res.data
    if (code === 0) {
      yield put({
        type: 'AUTHENTICATE_SUCCEEDED',
        authorization,
        version
      })
    } else {
      yield put({
        type: 'AUTHENTICATE_FAILED',
        version
      })
    }
  } catch (err) {
    console.error(err)
    yield put({
      type: 'AUTHENTICATE_FAILED',
      version: 'unknown'
    })
  }
}

/**
 * Handle SET_PROPERTY_REQUESTED.
 * Attempts to PUT the property value. On TIMEOUT (when requestTimeout and maxWait
 * are set), switches to a 500 ms polling loop that GETs the property until it
 * matches the intended value or total elapsed time exceeds requestTimeout + maxWait.
 * Dispatches SET_PROPERTY_SUCCEEDED, SET_PROPERTY_FAILED, SET_PROPERTY_TIMEOUT_WAIT,
 * or SET_PROPERTY_TIMEOUT_EXCEEDED as appropriate.
 */
function * performSetProperty (action) {
  yield put({type: 'SET_PROPERTY_START'})
  const start = (new Date()).getTime()
  const {propertyName, propertyValue, requestTimeout, maxWait, wrap} = action.payload
  let res
  const authorization = yield select(getAuthorization)
  try {
    res = yield call(setProperty, {authorization, propertyName, propertyValue, wrap, timeout: requestTimeout})
    const code = get(res, 'data.code')
    if (code === 0) {
      yield put({
        type: 'SET_PROPERTY_SUCCEEDED',
        name: propertyName,
        value: propertyValue
      })
    } else {
      yield put({type: 'SET_PROPERTY_FAILED', message: `Failed to set property ${propertyName} code: ${code}`})
    }
  } catch (err) {
    if (err.errorType === 'TIMEOUT' && requestTimeout && maxWait) {
      yield put({type: 'SET_PROPERTY_TIMEOUT_WAIT', name: propertyName})

      // Keep trying to update property until timeout
      while (true) {
        try {
          res = yield call(getProperty, {authorization, propertyName})
          const {code, result} = res.data
          if (result[0] === propertyValue) {
            yield put({
              type: 'SET_PROPERTY_SUCCEEDED',
              name: propertyName,
              value: propertyValue
            })
            break
          }
        } catch (err) {
        }

        yield delay(500)

        const now = (new Date()).getTime()
        if (now - start > (requestTimeout + maxWait)) {
          yield put({type: 'SET_PROPERTY_TIMEOUT_EXCEEDED', name: propertyName, message: `Failed to set property ${propertyName} due to timeout`})
          break
        }
      }
    } else {
      console.error(err)
      yield put({type: 'SET_PROPERTY_FAILED', message: `Failed to set property ${propertyName} due to unexpected error`})
    }
  }
}

/**
 * Handle GET_PROPERTY_REQUESTED.
 * Reads a named property from the admin API and dispatches GET_PROPERTY_SUCCEEDED
 * with the first result value, or GET_PROPERTY_FAILED on error.
 */
function * performGetProperty (action) {
  yield put({type: 'GET_PROPERTY_START'})
  const {propertyName} = action.payload
  try {
    const authorization = yield select(getAuthorization)
    const res = yield call(getProperty, {authorization, propertyName})
    const {code, result} = res.data
    if (code === 0) {
      yield put({
        type: 'GET_PROPERTY_SUCCEEDED',
        name: propertyName,
        value: result[0]
      })
    } else {
      yield put({type: 'GET_PROPERTY_FAILED', message: `Failed to get ${propertyName} code: ${code}`})
    }
  } catch (err) {
    console.error(err)
    yield put({type: 'GET_PROPERTY_FAILED', message: `Failed to get ${propertyName} due to unexpected error`})
  }
}

/**
 * Handle TRIGGER_EVENT_REQUESTED.
 * POSTs an event type to a named property endpoint. NETWORK_ERROR is treated as
 * success because mobile devices often drop the connection when the device resets
 * its network interface in response to the event (e.g. changing WiFi SSID).
 */
function * performTriggerEvent (action) {
  yield put({type: 'TRIGGER_EVENT_START'})
  const {propertyName, eventType} = action.payload
  try {
    const authorization = yield select(getAuthorization)
    const res = yield call(triggerEvent, {authorization, propertyName, eventType})
    const {code} = res
    if (code === 0) {
      yield put({
        type: 'TRIGGER_EVENT_SUCCEEDED',
        name: propertyName,
        event: eventType
      })
    } else {
      yield put({type: 'TRIGGER_EVENT_FAILED', message: `Failed to trigger event ${propertyName} code: ${code}`})
    }
  } catch (err) {
    console.error(err)
    // On mobile devices, trigger a system event that resets or closes the network
    // causes a 'Network Error', even though it succeeds
    // Work around is to treat that error as a success
    if (err.errorType === 'NETWORK_ERROR') {
      yield put({
        type: 'TRIGGER_EVENT_SUCCEEDED',
        name: propertyName,
        event: eventType
      })
    } else {
      yield put({type: 'TRIGGER_EVENT_FAILED', message: `Failed to trigger event ${propertyName} due to unexpected error`})
    }
  }
}

/**
 * Handle FETCH_NICK_REQUESTED.
 * Reads 'cb-chat-nick' from localStorage. If absent or 'undefined', generates a
 * random nick with generateNick() and persists it for the session.
 */
function * fetchNick (action) {
  let nick = localStorage.getItem('cb-chat-nick')
  if (!nick || nick === 'undefined') {
    nick = generateNick()
    localStorage.setItem('cb-chat-nick', nick)
  }

  yield put({
    type: 'FETCH_NICK_SUCCEEDED',
    nick
  })
}

/**
 * Handle SAVE_NICK_REQUESTED.
 * Persists the user's chosen nick to localStorage and dispatches SAVE_NICK_SUCCEEDED.
 */
function * saveNick (action) {
  localStorage.setItem('cb-chat-nick', action.nick)
  yield put({
    type: 'SAVE_NICK_SUCCEEDED',
    nick: action.nick
  })
}

/**
 * Handle FETCH_TEXT_DIRECTION_REQUESTED.
 * Reads 'cb-chat-text-direction' from localStorage; if absent, fetches the server
 * default and caches it. On any error falls back to 'ltr'.
 */
function * fetchTextDirection (action) {
  let textDirection = localStorage.getItem('cb-chat-text-direction')
  try {
    if (!textDirection || textDirection === 'undefined') {
      const res = yield call(getDefaultTextDirection)
      textDirection = res.data.result
      localStorage.setItem('cb-chat-text-direction', textDirection)
    }

    yield put({
      type: 'FETCH_TEXT_DIRECTION_SUCCEEDED',
      textDirection
    })
  } catch (e) {
    console.error(e)
    yield put({
      type: 'FETCH_TEXT_DIRECTION_SUCCEEDED',
      textDirection: 'ltr'
    })
  }
}

/**
 * Handle SAVE_TEXT_DIRECTION_REQUESTED.
 * Persists the chosen text direction to localStorage and dispatches SAVE_TEXT_DIRECTION_SUCCEEDED.
 */
function * saveTextDirection (action) {
  localStorage.setItem('cb-chat-text-direction', action.textDirection)
  yield put({
    type: 'SAVE_TEXT_DIRECTION_SUCCEEDED',
    textDirection: action.textDirection
  })
}

/**
 * Handle MESSAGE_SEND_REQUESTED.
 * Posts a chat message. On success immediately triggers a NEW_MESSAGES_FETCH_REQUESTED
 * so the sender's message appears without waiting for the next poll cycle.
 */
function * sendMessage (action) {
  const { message } = action

  try {
    const res = yield call(postMessage, {message})

    if (res.result && res.result.id) {
      yield put({
        type: 'MESSAGE_SEND_SUCCEEDED',
        messageId: res.result.id
      })
      yield put({
        type: 'NEW_MESSAGES_FETCH_REQUESTED'
      })
    } else {
      yield put({
        type: 'MESSAGE_SEND_FAILED',
        message
      })
    }
  } catch (e) {
    console.error(e)
    yield put({type: 'MESSAGE_SEND_FAILED', message})
  }
}

/**
 * Handle NEW_MESSAGES_FETCH_REQUESTED.
 * Fetches messages with id > maxMessageId (incremental poll). Sets checkMentions
 * so the reducer scans for @nick mentions in new messages.
 */
function * fetchNewMessages (action) {
  try {
    yield put({type: 'MESSAGES_FETCH_START'})
    const maxMessageId = yield select(getMaxMessageId)
    const res = yield call(getMessages, {max_id: maxMessageId})
    yield put({
      type: 'MESSAGES_FETCH_SUCCEEDED',
      messages: res ? res.data.result : [],
      checkMentions: true
    })
  } catch (e) {
    console.error(e)
    yield put({type: 'MESSAGES_FETCH_FAILED', message: 'Failed to load messages'})
  }
}

/**
 * Handle MESSAGES_FETCH_REQUESTED.
 * Fetches the full message history (no max_id filter). Used when opening the
 * chat panel for the first time.
 */
function * fetchMessages (action) {
  try {
    yield put({type: 'MESSAGES_FETCH_START'})
    const res = yield call(getMessages)
    yield put({
      type: 'MESSAGES_FETCH_SUCCEEDED',
      messages: res.data.result
    })
  } catch (e) {
    console.error(e)
    yield put({type: 'MESSAGES_FETCH_FAILED', message: 'Failed to load messages'})
  }
}

/**
 * Handle CONTENT_FETCH_REQUESTED.
 * 1. Lazily loads config JSON on first call (needsConfig flag).
 * 2. Fetches the directory listing for the requested content path.
 * 3. At the root path, also fetches the stats file for popular-files display
 *    (only once — skipped if popularFiles is already in state).
 */
function * fetchContent (action) {
  try {
    yield put({type: 'LOADING_START'})
    const needsConfig = yield select(checkNeedsConfig)

    if (needsConfig) {
      try {
        const configPath = yield select(getConfigPath)
        const config = yield call(getConfig, {configPath})

        yield put({
          type: 'CONFIG_FETCH_SUCCEEDED',
          config: config.data
        })
      } catch (e) {
        console.error(e.message)
        yield put({type: 'CONFIG_FETCH_FAILED', message: 'Unable to load configuration'})
        return
      }
    }
    const {contentPath} = action.payload
    const content = yield call(getContent, {contentPath})
    yield put({
      type: 'CONTENT_FETCH_SUCCEEDED',
      content: content.data,
      contentPath: contentPath
    })

    const popularFiles = yield select(getPopularFiles)
    if (popularFiles === null && (contentPath === '' || contentPath === '/')) {
      const config = yield select(getConfigFromStore)
      try {
        const stats = yield call(getStats, {statsPath: `${process.env.PUBLIC_URL}/${config.Client.stats_file}`})
        yield put({
          type: 'STATS_FETCH_SUCCEEDED',
          stats: stats.data
        })
      } catch (e) {
        console.error(e.message)
        yield put({type: 'STATS_FETCH_FAILED', message: 'Unable to load popular files'})
      }
    }
  } catch (e) {
    console.error(e.message)
    yield put({type: 'CONTENT_FETCH_FAILED', message: 'Unable to load content'})
  }
}

/**
 * Root saga. Wires all action types to their handler generators.
 * takeLatest cancels any in-flight saga of the same type before starting a new
 * one (used for navigation and message fetches where only the newest request matters).
 * takeEvery allows concurrent sagas (used for property writes that must all complete).
 */
function * mySaga () {
  yield takeLatest('CONTENT_FETCH_REQUESTED', fetchContent)
  yield takeLatest('MESSAGES_FETCH_REQUESTED', fetchMessages)
  yield takeLatest('NEW_MESSAGES_FETCH_REQUESTED', fetchNewMessages)
  yield takeLatest('MESSAGE_SEND_REQUESTED', sendMessage)
  yield takeLatest('FETCH_NICK_REQUESTED', fetchNick)
  yield takeLatest('SAVE_NICK_REQUESTED', saveNick)
  yield takeLatest('FETCH_TEXT_DIRECTION_REQUESTED', fetchTextDirection)
  yield takeLatest('SAVE_TEXT_DIRECTION_REQUESTED', saveTextDirection)
  yield takeEvery('GET_PROPERTY_REQUESTED', performGetProperty)
  yield takeEvery('SET_PROPERTY_REQUESTED', performSetProperty)
  yield takeEvery('TRIGGER_EVENT_REQUESTED', performTriggerEvent)
  yield takeEvery('AUTHENTICATE_REQUESTED', performAuthenticate)
}

export default mySaga
