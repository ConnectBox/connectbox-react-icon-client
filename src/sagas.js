import { generateNick } from './utils'
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

function * performCheckAuth (action) {
  yield put({type: 'CHECK_AUTH_START'})
  try {
    const res = yield call(getProperty, 'ui-config')
    const { code } = res
    if (code === 0) {
      yield put({
        type: 'CHECK_AUTH_SUCCEEDED'
      })
    } else {
      yield put({
        type: 'CHECK_AUTH_FAILED'
      })
    }
  } catch (err) {
    console.error(err)
    yield put({
      type: 'CHECK_AUTH_FAILED'
    })
  }
}

function * performSetProperty (action) {
  yield put({type: 'SET_PROPERTY_START'})
  const {propertyName, propertyValue, wrap} = action.payload
  try {
    const res = yield call(setProperty, propertyName, propertyValue, wrap)
    const {code} = res
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
    console.error(err)
    yield put({type: 'SET_PROPERTY_FAILED', message: `Failed to set property ${propertyName} due to unexpected error`})
  }
}

function * performGetProperty (action) {
  yield put({type: 'GET_PROPERTY_START'})
  const {propertyName} = action.payload
  try {
    const res = yield call(getProperty, propertyName)
    const {code, result} = res
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

function * performTriggerEvent (action) {
  yield put({type: 'TRIGGER_EVENT_START'})
  const {propertyName, eventType} = action.payload
  try {
    const res = yield call(triggerEvent, propertyName, eventType)
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
    yield put({type: 'TRIGGER_EVENT_FAILED', message: `Failed to trigger event ${propertyName} due to unexpected error`})
  }
}

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

function * saveNick (action) {
  localStorage.setItem('cb-chat-nick', action.nick)
  yield put({
    type: 'SAVE_NICK_SUCCEEDED',
    nick: action.nick
  })
}

function * fetchTextDirection (action) {
  let textDirection = localStorage.getItem('cb-chat-text-direction')
  if (!textDirection || textDirection === 'undefined') {
    const res = yield call(getDefaultTextDirection)
    textDirection = res.result
    localStorage.setItem('cb-chat-text-direction', textDirection)
  }

  yield put({
    type: 'FETCH_TEXT_DIRECTION_SUCCEEDED',
    textDirection
  })
}

function * saveTextDirection (action) {
  localStorage.setItem('cb-chat-text-direction', action.textDirection)
  yield put({
    type: 'SAVE_TEXT_DIRECTION_SUCCEEDED',
    textDirection: action.textDirection
  })
}

function * sendMessage (action) {
  const { message } = action

  try {
    const res = yield call(postMessage, message)

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

function * fetchNewMessages (action) {
  try {
    yield put({type: 'MESSAGES_FETCH_START'})
    const maxMessageId = yield select(getMaxMessageId)
    const res = yield call(getMessages, maxMessageId)
    yield put({
      type: 'MESSAGES_FETCH_SUCCEEDED',
      messages: res ? res.result : [],
      checkMentions: true
    })
  } catch (e) {
    console.error(e)
    yield put({type: 'MESSAGES_FETCH_FAILED', message: 'Failed to load messages'})
  }
}

function * fetchMessages (action) {
  try {
    yield put({type: 'MESSAGES_FETCH_START'})
    const res = yield call(getMessages)
    yield put({
      type: 'MESSAGES_FETCH_SUCCEEDED',
      messages: res.result
    })
  } catch (e) {
    console.error(e)
    yield put({type: 'MESSAGES_FETCH_FAILED', message: 'Failed to load messages'})
  }
}

// worker Saga: will be fired on USER_FETCH_REQUESTED actions
function * fetchContent (action) {
  try {
    yield put({type: 'LOADING_START'})
    const needsConfig = yield select(checkNeedsConfig)

    if (needsConfig) {
      try {
        const configPath = yield select(getConfigPath)
        const config = yield call(getConfig, configPath)

        yield put({
          type: 'CONFIG_FETCH_SUCCEEDED',
          config: config
        })
      } catch (e) {
        console.error(e.message)
        yield put({type: 'CONFIG_FETCH_FAILED', message: 'Unable to load configuration'})
        return
      }
    }
    const {contentPath} = action.payload
    const content = yield call(getContent, contentPath)
    yield put({
      type: 'CONTENT_FETCH_SUCCEEDED',
      content: content,
      contentPath: contentPath
    })

    const popularFiles = yield select(getPopularFiles)
    if (popularFiles === null && (contentPath === '' || contentPath === '/')) {
      const config = yield select(getConfigFromStore)
      try {
        const stats = yield call(getStats, `${process.env.PUBLIC_URL}/${config.Client.stats_file}`)
        yield put({
          type: 'STATS_FETCH_SUCCEEDED',
          stats: stats
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

function * mySaga () {
  yield takeLatest('CONTENT_FETCH_REQUESTED', fetchContent)
  yield takeLatest('MESSAGES_FETCH_REQUESTED', fetchMessages)
  yield takeLatest('NEW_MESSAGES_FETCH_REQUESTED', fetchNewMessages)
  yield takeLatest('MESSAGE_SEND_REQUESTED', sendMessage)
  yield takeLatest('FETCH_NICK_REQUESTED', fetchNick)
  yield takeLatest('SAVE_NICK_REQUESTED', saveNick)
  yield takeLatest('FETCH_TEXT_DIRECTION_REQUESTED', fetchTextDirection)
  yield takeLatest('SAVE_TEXT_DIRECTION_REQUESTED', saveTextDirection)
  yield takeLatest('CHECK_AUTH_REQUESTED', performCheckAuth)
  yield takeEvery('GET_PROPERTY_REQUESTED', performGetProperty)
  yield takeEvery('SET_PROPERTY_REQUESTED', performSetProperty)
  yield takeEvery('TRIGGER_EVENT_REQUESTED', performTriggerEvent)
}

export default mySaga
