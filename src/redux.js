import { generateNick } from './utils'

export function getContent (contentPath, callback) {
  return { type: 'CONTENT_FETCH_REQUESTED', payload: { contentPath, callback } }
}

export function sendMessage (message, callback) {
  return { type: 'MESSAGE_SEND_REQUESTED', message }
}

export function getMessages (callback) {
  return { type: 'MESSAGES_FETCH_REQUESTED' }
}

export function fetchNick (callback) {
  return { type: 'FETCH_NICK_REQUESTED' }
}

export function saveNick (nick, callback) {
  return { type: 'SAVE_NICK_REQUESTED', nick }
}

export function getNewMessages (callback) {
  return { type: 'NEW_MESSAGES_FETCH_REQUESTED' }
}

export function setConfigPath (configPath, callback) {
  let path = configPath
  if (!path) {
    path = '/config/default.json'
  }
  return { type: 'SET_CONFIG_PATH', payload: {configPath: path} }
}

export function clearMention (callback) {
  return { type: 'CLEAR_MENTION' }
}

export function toggleChatPanel (showing, callback) {
  return { type: 'TOGGLE_CHAT_PANEL', showing }
}

export const initialState = {
  error: undefined,
  contentPath: '',
  content: undefined
}

const fileExtension = (fname) => {
  return fname.substr((~-fname.lastIndexOf('.') >>> 0) + 2)
}

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
      dir.icon_class = ico
    }
  }
}

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
    return { ...state, error: action.message }
  },

  'MESSAGES_FETCH_START': (state, action) => {
    return { ...state, error: action.message, loadingMessages: true }
  },

  'MESSAGES_FETCH_SUCCEEDED': (state, action) => {
    const { messages } = action
    return {
      ...state,
      maxMessageId: messages.length > 0 ? messages.reduce((max, message) =>
        message.id > max ? message.id : max, 0) : state.maxMessageId,
      messages: Object.assign({}, state.messages, messages.reduce((map, message) => {
        map[message.id] = message
        return map
      }, {})),
      mention: action.checkMentions ? (state.mention ? true : messages.reduce((mentioned, message) => {
        if (!mentioned) {
          if (message.body.indexOf(`@${state.nick}`) !== -1) {
            return true
          }
          return false
        }
        return true
      }, false)) : false,
      loadingMessages: false
    }
  },

  'MESSAGES_FETCH_FAILED': (state, action) => {
    return { ...state, error: action.message, loadingMessages: false }
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
    let nick = action.nick
    if (!nick) {
      nick = generateNick()
      saveNick(nick)
    }
    return { ...state, nick }
  },

  'SAVE_NICK_SUCCEEDED': (state, action) => {
    return { ...state, nick: action.nick }
  },

  'TOGGLE_CHAT_PANEL': (state, action) => {
    return { ...state, chatPanelShowing: action.showing }
  },

  'CLEAR_MENTION': (state, action) => {
    return { ...state, mention: false }
  }

}
