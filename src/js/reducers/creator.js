// @flow
import type { Action, CreatorState } from '../flow'

const defaultCreds = {
  realName: '',
  nickname: '',
  server: 'irc.libera.chat',
  port: 6667,
  password: ''
}

// TODO: call this LoginState
export function init(): CreatorState {
  const state = {
    isConnecting: false,
    credentials: defaultCreds,
    connection: null,
    error: null
  }

  return state
}

function creator(state: CreatorState = init(), action: Action): CreatorState {
  switch (action.type) {
    case 'CREDENTIALS_UPDATE': {
      return Object.assign({}, state, {
        credentials: Object.assign({}, state.credentials, action.update)
      })
    }
    case 'REQUEST_CONNECTION_PENDING': {
      return Object.assign({}, state, {
        isConnecting: true,
        error: null,
        connection: action.connection
      })
    }
    case 'REQUEST_CONNECTION_SUCCESS': {
      return Object.assign({}, state, {
        isConnecting: false,
        connection: null,
        error: null,
        credentials: defaultCreds
      })
    }
    case 'REQUEST_CONNECTION_ERROR': {
      return Object.assign({}, state, {
        isConnecting: false,
        error: action.error
      })
    }
    case 'CONNECTION_CLOSED': {
      if (state.connection && action.connectionId === state.connection.id) {
        return Object.assign({}, state, {
          connection: Object.assign({}, state.connection, {
            isConnected: false
          })
        })
      } else {
        return state
      }
    }
    default:
      return state
  }
}

export default creator
