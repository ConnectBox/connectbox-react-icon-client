/**
 * @fileoverview Redux action creators, private helpers, and reducer for the
 * ConnectBox React icon client.
 *
 * Action creators return plain objects consumed by sagas.js via takeLatest /
 * takeEvery bindings. Private helpers (fileExtension, parseIcoMetadata,
 * postProcessContent, postProcessStats) transform raw API data before it is
 * stored in Redux state. The single reducer delegates to a `handlers` map
 * keyed by action type; unrecognised actions fall through to the identity branch.
 */

/**
 * Request authentication with the given admin password.
 * Triggers AUTHENTICATE_REQUESTED → performAuthenticate saga.
 * @param {string} password
 */
export function authenticate (password) {
  return { type: 'AUTHENTICATE_REQUESTED', payload: { password } }
}

/**
 * Clear the passwordUpdated flag and nullify the in-memory authorization token
 * after a successful password change so the UI stops showing the success banner.
 */
export function clearPasswordUpdated () {
  return { type: 'CLEAR_PASSWORD_UPDATED' }
}

/**
 * Attempt to restore a previous admin session from localStorage.
 * Reads 'admin-authorization', decodes the Base64 Basic-auth value, and
 * re-issues an AUTHENTICATE_REQUESTED with the stored password so the saga
 * can validate it against the live device. Falls back to an empty password
 * (unauthenticated) if no valid token is found.
 */
export function checkAuthenticated () {
  const authorization = localStorage.getItem('admin-authorization')

  if (authorization) {
    const parts = authorization.split(' ')
    if (parts.length === 2) {
      const decoded = atob(parts[1])
      const creds = decoded.split(':')
      if (creds.length === 2) {
        return { type: 'AUTHENTICATE_REQUESTED', payload: { password: creds[1] } }
      }
    }
  }
  return { type: 'AUTHENTICATE_REQUESTED', payload: { password: '' } }
}

/**
 * Write a named device property via the admin API.
 * @param {string}   propertyName
 * @param {*}        propertyValue
 * @param {boolean}  [wrap=true] - When true the saga wraps the value as {value: propertyValue}.
 * @param {number}   [requestTimeout] - Per-request timeout in ms.
 * @param {number}   [maxWait] - Maximum total wait ms when using the timeout-retry loop.
 * @param {Function} [callback] - Optional post-success callback (unused by the saga; kept for callers).
 */
export function setProperty (propertyName, propertyValue, wrap = true, requestTimeout, maxWait, callback) {
  return { type: 'SET_PROPERTY_REQUESTED', payload: {propertyName, propertyValue, wrap, requestTimeout, maxWait, callback} }
}

/**
 * Read a named device property from the admin API.
 * Result is stored in state as prop_<propertyName> (dashes replaced with underscores).
 * @param {string}   propertyName
 * @param {Function} [callback]
 */
export function getProperty (propertyName, callback) {
  return { type: 'GET_PROPERTY_REQUESTED', payload: {propertyName, callback}}
}

/**
 * POST an event to a named property endpoint (e.g. reboot, reset).
 * Network errors are treated as success by the saga because mobile devices
 * often drop the connection during a network-resetting event.
 * @param {string}   propertyName - API route key.
 * @param {string}   eventType - Event string sent as {value: eventType}.
 * @param {Function} [callback]
 */
export function triggerEvent (propertyName, eventType, callback) {
  return { type: 'TRIGGER_EVENT_REQUESTED', payload: {propertyName, eventType, callback}}
}

/**
 * Fetch the directory listing for contentPath.
 * On root fetch also loads config (if not yet loaded) and stats.
 * @param {string}   contentPath - Path under /content/.
 * @param {Function} [callback]
 */
export function getContent (contentPath, callback) {
  return { type: 'CONTENT_FETCH_REQUESTED', payload: { contentPath, callback } }
}

/**
 * Post a chat message. After success the saga immediately requests new messages
 * so the sender's own message appears in the chat list without polling delay.
 * @param {string} message - Message body text.
 */
export function sendMessage (message, callback) {
  return { type: 'MESSAGE_SEND_REQUESTED', message }
}

/** Fetch the full message history (used on initial chat panel open). */
export function getMessages (callback) {
  return { type: 'MESSAGES_FETCH_REQUESTED' }
}

/**
 * Load the user's chat nick from localStorage; generate and persist a random
 * one via generateNick() if none is stored or the stored value is 'undefined'.
 */
export function fetchNick (callback) {
  return { type: 'FETCH_NICK_REQUESTED' }
}

/**
 * Persist the user's chosen chat nick to localStorage and update Redux state.
 * @param {string} nick
 */
export function saveNick (nick, callback) {
  return { type: 'SAVE_NICK_REQUESTED', nick }
}

/**
 * Load the preferred text direction from localStorage, falling back to the
 * server default if not cached. On error defaults to 'ltr'.
 */
export function fetchTextDirection (callback) {
  return { type: 'FETCH_TEXT_DIRECTION_REQUESTED' }
}

/**
 * Persist the user's chosen text direction ('ltr'/'rtl') to localStorage and
 * update Redux state.
 * @param {string} textDirection
 */
export function saveTextDirection (textDirection, callback) {
  return { type: 'SAVE_TEXT_DIRECTION_REQUESTED', textDirection }
}

/**
 * Poll for messages newer than state.maxMessageId.
 * Sets the mention flag if any new message contains '@<nick>'.
 */
export function getNewMessages (callback) {
  return { type: 'NEW_MESSAGES_FETCH_REQUESTED' }
}

/**
 * Set the URL from which the app should fetch its config JSON.
 * Defaults to PUBLIC_URL/config/default.json when configPath is falsy.
 * @param {string} configPath
 */
export function setConfigPath (configPath, callback) {
  let path = configPath
  if (!path) {
    path = `${process.env.PUBLIC_URL}/config/default.json`
  }
  return { type: 'SET_CONFIG_PATH', payload: {configPath: path} }
}

/** Clear the mention and newMessages notification flags. */
export function clearMessageNotifications (callback) {
  return { type: 'CLEAR_MESSAGE_NOTIFICATIONS' }
}

/**
 * Show or hide the chat panel.
 * @param {boolean} showing
 */
export function toggleChatPanel (showing, callback) {
  return { type: 'TOGGLE_CHAT_PANEL', showing }
}

export const initialState = {
  error: undefined,
  contentPath: '',
  content: undefined
}

/**
 * Extract the file extension from a filename, or '' if there is none.
 * Uses a bit-trick to return '' rather than the full name when there is no dot.
 * @param {string} fname
 * @returns {string}
 */
const fileExtension = (fname) => {
  return fname.substr((~-fname.lastIndexOf('.') >>> 0) + 2)
}

/**
 * Parse a ConnectBox icon metadata filename and attach icon info to the matching dirMap entry.
 * Filenames with an extension are treated as image icons (icon_file); filenames without an
 * extension are treated as Font Awesome class overrides (icon_class).
 * Format: <prefix><dirName>.<ext>  or  <prefix><dirName>_<fa-class>
 * @param {string} prefix - Icon filename prefix from config (e.g. '_icon_').
 * @param {string} filename - The icon metadata filename.
 * @param {Object} dirMap - Map of directory name → content item; mutated in place.
 */
const parseIcoMetadata = (prefix, filename, dirMap) => {
  let ext = fileExtension(filename)

  const metadata = filename.substring(prefix.length)

  if (ext) {
    let dirName = metadata.substring(0, metadata.lastIndexOf('.'))
    if (dirMap[dirName]) {
      let dir = dirMap[dirName]
      dir.icon_file = filename
    }
  } else {
    let parts = metadata.split('_')
    let dirName = parts[0]
    let ico = parts[1]

    if (dirMap[dirName]) {
      let dir = dirMap[dirName]
      dir.icon_class = ico.startsWith('fa-') ? ico : `fa-${ico}`
    }
  }
}

/**
 * Transform a raw content listing from the API before storing in Redux state.
 * - Tags each item with isTopLevel, mtime (Date), and ext.
 * - Builds a dirMap to receive icon metadata from icon-prefix files.
 * - Filters out excluded files (config.Client.excluded_files patterns) and dotfiles.
 * - Strips icon-prefix files after using them to update dirMap.
 * - At the root level, separates loose files from directories (topLevelFiles).
 * @param {Object[]} content - Raw file/directory array from the API.
 * @param {string}   contentPath - Currently browsed path ('' or '/' = root).
 * @param {Object}   state - Redux state (used to access config).
 * @returns {[Object[], Object[]|null]} [files, topLevelFiles] — topLevelFiles is null below root.
 */
const postProcessContent = (content, contentPath, state) => {
  const {config} = state
  const isTopLevel = contentPath === '' || contentPath === '/'
  const dirMap = {}
  content.map((f) => {
    f.isTopLevel = isTopLevel
    f.mtime = new Date(f.mtime)
    if (f.type === 'file') {
      f.ext = fileExtension(f.name)
      if (f.isTopLevel) {
        f.isTopLevel = false
      }
    } else {
      dirMap[f.name] = f
    }

    return f
  })

  const excludeFilters = config.Client.excluded_files ? config.Client.excluded_files.map((pattern) => {
    return RegExp(pattern, 'i')
  }) : []

  excludeFilters.push(/^\..*/)
  // Remove excluded files
  let files = content.filter((f) => {
    const excluded = excludeFilters.reduce((a, b) => a || RegExp(b).test(f.name), false)
    if (excluded) {
      return false
    }

    if (f.name.startsWith(config.Client.icon_prefix)) {
      parseIcoMetadata(config.Client.icon_prefix, f.name, dirMap)
      return false
    } else {
      return true
    }
  })

  let topLevelFiles = null
  if (isTopLevel) {
    topLevelFiles = files.filter(f => f.type === 'file')
    files = files.filter(f => f.type === 'directory')
  }

  return [files, topLevelFiles]
}

/**
 * Transform raw stats from the stats JSON file into a popularFiles array.
 * - Reads the 'year' bucket from the stats object.
 * - Extracts the filename from each resource URL and its extension.
 * - Computes a normalized popularity score (1–5) based on min/max count so
 *   the UI can render relative bar widths without knowing absolute counts.
 * @param {Object} stats - Raw stats object with year/month/week buckets.
 * @returns {Object[]} Array of file objects with name, ext, count, and score fields.
 */
const postProcessStats = (stats) => {
  let popularFiles = []
  let max = 0
  let min = 2147483647
  popularFiles = ((stats && stats['year']) || []).map(function (f) {
    var resource = f.resource
    var parts = resource.split('/')
    f.name = decodeURIComponent(parts[parts.length - 1])
    f.ext = fileExtension(f.name)
    if (f.count > max) {
      max = f.count
    }
    if (f.count < min) {
      min = f.count
    }
    return f
  })

  var maxMin = (max - min)
  if (maxMin <= 0) {
    maxMin = 1
  }
  popularFiles = popularFiles.map(function (f) {
    f.score = Math.round(4 * (f.count - min) / maxMin + 1)
    return f
  })

  return popularFiles
}

/**
 * Root reducer. Delegates to the `handlers` map by action.type.
 * Unrecognised action types fall through to the identity branch (state returned unchanged).
 */
export default function reducer (state = initialState, action) {
  const handler = handlers[action.type]
  return handler ? handler(state, action) : state
}

const handlers = {
  'CONTENT_FETCH_SUCCEEDED': (state, action) => {
    const { content, contentPath } = action
    const [files, topLevelFiles] = postProcessContent(content, contentPath, state)
    return { ...state, content: files, topLevelFiles, contentPath, loading: false }
  },

  'CONTENT_FETCH_FAILED': (state, action) => {
    return { ...state, error: action.message, loading: false }
  },

  'CONFIG_FETCH_SUCCEEDED': (state, action) => {
    return { ...state, config: action.config, needsConfig: false }
  },

  'CONFIG_FETCH_FAILED': (state, action) => {
    return { ...state, error: action.message }
  },

  'SET_CONFIG_PATH': (state, action) => {
    return { ...state, configPath: action.payload.configPath }
  },

  'LOADING_START': (state, action) => {
    return { ...state, loading: true }
  },

  'STATS_FETCH_SUCCEEDED': (state, action) => {
    const {stats} = action
    const popularFiles = postProcessStats(stats)
    return { ...state, popularFiles }
  },

  'STATS_FETCH_FAILED': (state, action) => {
    console.warn('Failed to fetch stats')
    return { ...state }
  },

  'MESSAGES_FETCH_START': (state, action) => {
    return { ...state, error: action.message, loadingMessages: true }
  },

  'MESSAGES_FETCH_SUCCEEDED': (state, action) => {
    const { messages } = action
    const mention = action.checkMentions ? (state.mention ? true : messages.reduce((mentioned, message) => {
      if (!mentioned) {
        if (message.body.indexOf(`@${state.nick}`) !== -1) {
          return true
        }
        return false
      }
      return true
    }, false)) : false
    return {
      ...state,
      chatOffline: false,
      maxMessageId: messages.length > 0 ? messages.reduce((max, message) =>
        message.id > max ? message.id : max, 0) : state.maxMessageId,
      messages: Object.assign({}, state.messages, messages.reduce((map, message) => {
        map[message.id] = message
        return map
      }, {})),
      mention,
      loadingMessages: false,
      newMessages: !mention && state.maxMessageId !== undefined && (state.newMessages || (messages && messages.length > 0))
    }
  },

  'MESSAGES_FETCH_FAILED': (state, action) => {
    return { ...state, chatOffline: true, loadingMessages: false }
  },

  'MESSAGE_SEND_SUCCEEDED': (state, action) => {
    return {
      ...state,
      sentMessages: [
        ...state.sentMessages,
        action.messageId
      ]
    }
  },

  'MESSAGE_SEND_FAILED': (state, action) => {
    return { ...state, error: action.message }
  },

  'FETCH_NICK_SUCCEEDED': (state, action) => {
    return { ...state, nick: action.nick }
  },

  'SAVE_NICK_SUCCEEDED': (state, action) => {
    return { ...state, nick: action.nick }
  },

  'FETCH_TEXT_DIRECTION_SUCCEEDED': (state, action) => {
    return { ...state, textDirection: action.textDirection }
  },

  'SAVE_TEXT_DIRECTION_SUCCEEDED': (state, action) => {
    return { ...state, textDirection: action.textDirection }
  },

  'TOGGLE_CHAT_PANEL': (state, action) => {
    return { ...state, chatPanelShowing: action.showing }
  },

  'CLEAR_MESSAGE_NOTIFICATIONS': (state, action) => {
    return { ...state, mention: false, newMessages: false }
  },

  'GET_PROPERTY_START': (state, action) => {
    return { ...state, adminLoadError: null }
  },

  'GET_PROPERTY_FAILED': (state, action) => {
    return { ...state, adminLoadError: action.message}
  },

  'GET_PROPERTY_SUCCEEDED': (state, action) => {
    const {name, value} = action
    return { ...state, [`prop_${name.replace('-', '_')}`]: name === 'ui-config' ? JSON.parse(value) : value}
  },

  'SET_PROPERTY_START': (state, action) => {
    return { ...state, propertyUpdating: true, adminError: null, propertyTimeoutWait: false }
  },

  'SET_PROPERTY_FAILED': (state, action) => {
    return { ...state, adminError: action.message, propertyUpdating: false }
  },

  'SET_PROPERTY_TIMEOUT_WAIT': (state, action) => {
    return { ...state, propertyTimeoutWait: true }
  },

  'SET_PROPERTY_TIMEOUT_EXCEEDED': (state, action) => {
    return { ...state, propertyUpdating: false, adminError: action.message }
  },

  'SET_PROPERTY_SUCCEEDED': (state, action) => {
    const {name, value} = action
    const nameSafe = name.replace('-', '_')
    const passwordUpdated = nameSafe === 'password'
    return { ...state,
      [`prop_${nameSafe}`]: !passwordUpdated ? value : null,
      latestPropUpdate: nameSafe,
      propertyUpdating: false,
      passwordUpdated
    }
  },

  'TRIGGER_EVENT_START': (state, action) => {
    return { ...state, propertyUpdating: true, adminError: null }
  },

  'TRIGGER_EVENT_FAILED': (state, action) => {
    return { ...state, adminError: action.message, propertyUpdating: false}
  },

  'TRIGGER_EVENT_SUCCEEDED': (state, action) => {
    const {name, event} = action
    return { ...state, [`evt_${name.replace('-', '_')}`]: event, propertyUpdating: false}
  },

  'CLEAR_PASSWORD_UPDATED': (state, action) => {
    return { ...state, passwordUpdated: false, authorization: null }
  },

  'AUTHENTICATE_START': (state, action) => {
    return { ...state, authorization: '' }
  },

  'AUTHENTICATE_SUCCEEDED': (state, action) => {
    const { authorization, version } = action
    localStorage.setItem('admin-authorization', authorization)
    return { ...state, authorization, version }
  },

  'AUTHENTICATE_FAILED': (state, action) => {
    const { version } = action
    localStorage.setItem('admin-authorization', null)
    return { ...state, authorization: null, version }
  }
}
