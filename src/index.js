/** @fileoverview Application entry point. Configures the Redux store with saga
 * middleware and Redux DevTools support, then mounts the root React component
 * wrapped in a Redux Provider and BrowserRouter. */

// import './index.css'

import React from 'react'
import ReactDOM from 'react-dom'
import ConnectBoxApp from './ConnectBoxApp'
import { Provider } from 'react-redux'

import { createStore, applyMiddleware, compose } from 'redux'
import createSagaMiddleware from 'redux-saga'

import reducer from './redux'
import mySaga from './sagas'
import { BrowserRouter } from 'react-router-dom'

// Polyfill String.prototype.startsWith for browsers (e.g. older Android WebView)
// that don't yet support ES6. The eslint disable is intentional — extending
// native prototypes is the correct approach for a polyfill.
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith#Polyfill#Polyfill
if (!String.prototype.startsWith) {
  String.prototype.startsWith = function (search, pos) { // eslint-disable-line no-extend-native
    return this.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search
  }
}

// Use the Redux DevTools browser extension when available, otherwise fall back
// to a no-op enhancer so the compose() call below is always valid.
const devTools =
  (typeof window === 'object' && window.devToolsExtension) ||
  (() => noop => noop)

const sagaMiddleware = createSagaMiddleware()

// initialState provides the default values for every Redux slice so the app
// can render safely before any async fetches complete. The config block here
// mirrors the shape of the server-side default.json loaded by setConfigPath.
let initialState = {
  authorization: null,
  authenticateFailed: null,
  chatPanelShowing: false,
  // DEFAULT CONFIG
  config: {
    'Content': {
      'contentRoute': '/content'
    },
    'Client': {
      'banner': false,
      'tail_slash': true,
      'display_root_folder_names': true,
      'icon_prefix': '_icon_',
      'stats_file': 'stats.top10.json'
    }
  },
  content: [],
  // DEFAULT CONFIG PATH
  configPath: `${process.env.PUBLIC_URL}/config/default.json`,
  contentPath: '',
  error: undefined,
  iconMetadata: window.iconMetadata,
  mention: false,
  messages: {},
  needsConfig: true,
  newMessages: false,
  nick: null,
  loading: false,
  popularFiles: null,
  sentMessages: [],
  textDirection: 'ltr',
  propertyUpdating: false,
  propertyTimeoutWait: false,
  latestPropUpdate: '',
  prop_ssid: '',
  prop_channel: '1',
  prop_ui_config: null,
  prop_hostname: '',
  prop_staticsite: 'false',
  passwordUpdated: false,
  version: 'unknown'
}
let store = createStore(reducer, initialState, compose(applyMiddleware(sagaMiddleware), devTools()))

sagaMiddleware.run(mySaga)

ReactDOM.render(
  <Provider store={store}>
    <BrowserRouter>
      <ConnectBoxApp />
    </BrowserRouter>
  </Provider>
    , document.getElementById('root'))
