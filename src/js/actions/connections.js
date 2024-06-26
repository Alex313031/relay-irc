// @flow
import net from 'net'
import irc from 'slate-irc'
const electronLog = require('electron-log');
import { credentialsToId } from '../reducers/credentials'
import equalNames from '../modules/equalNames'
import type { Thunk, CredentialsT } from '../flow'

export const CONNECTION_CLOSED = 'CONNECTION_CLOSED'

function any<A>(list: Array<A>, predicate: (val: A) => boolean): boolean {
  for (let i = 0; i < list.length; i++) {
    if (predicate(list[i])) {
      return true
    }
  }
  return false
}

export const connectToServer = (
  credentials: CredentialsT,
  remember: boolean
): Thunk => {
  const { realName, nickname, server, port } = credentials

  return (dispatch, getState) => {
    const id = credentialsToId(credentials)

    if (
      any(
        getState().connections.list.map((conn) => conn.id),
        (connId) => connId === id
      )
    ) {
      return dispatch({
        type: 'REQUEST_CONNECTION_ERROR',
        connectionId: id,
        error: 'Connection already exists'
      })
    }

    const stream = createIrcStream({
      credentials,
      dispatch,
      getState,
      remember
    })

    dispatch({
      type: 'REQUEST_CONNECTION_PENDING',
      connection: {
        id,
        isConnected: false,
        isWelcome: false,
        nickname,
        realName,
        server,
        port,
        stream,
        error: null,
        conversations: null
      }
    })

    stream.on('errors', (e) => {
      dispatch({ type: 'IRC_ERROR', connectionId: id, message: e.message })
    })

    stream.on('mode', (e) => {
      electronLog.info('Mode:', e)
    })

    stream.on('invite', (e) => {
      electronLog.info('Invite:', e)
    })

    stream.on('notice', (e) => {
      const channelInMessage = getChannelFromNotice(e.message)

      var to, message
      if (channelInMessage) {
        const splitMessage = e.message.split(' ')
        splitMessage.shift() // remove leading channel name

        to = channelInMessage
        message = splitMessage.join(' ')
      } else {
        to = e.to
        message = e.message
      }

      dispatch({
        type: 'RECEIVE_NOTICE',
        connectionId: id,
        from: e.from,
        to,
        message
      })
    })

    stream.on('away', (e) => {
      dispatch({
        type: 'RECEIVE_AWAY',
        connectionId: id,
        nick: e.nick,
        message: e.message
      })
    })

    stream.on('part', (e) => {
      dispatch({
        type: 'RECEIVE_PART',
        connectionId: id,
        nick: e.nick,
        message: e.message,
        channels: e.channels
      })
    })

    stream.on('quit', (e) => {
      dispatch({
        type: 'RECEIVE_QUIT',
        connectionId: id,
        nick: e.nick,
        message: e.message
      })
    })

    stream.on('kick', (e) => {
      electronLog.info('Kick:', e)
    })

    stream.on('motd', (e) => {
      dispatch({
        type: 'RECEIVE_MOTD',
        connectionId: id,
        motd: e.motd.join('\n')
      })
    })

    stream.on('welcome', (nick) => {
      dispatch({
        type: 'RECEIVE_WELCOME',
        connectionId: id,
        nick
      })
    })

    stream.on('nick', (e) => {
      dispatch({
        type: 'RECEIVE_NICK',
        connectionId: id,
        oldNickname: e.nick,
        newNickname: e.new
      })
    })

    stream.on('topic', (e) => {
      dispatch({
        type: 'RECEIVE_TOPIC',
        connectionId: id,
        channel: e.channel,
        topic: e.topic
      })
    })

    stream.on('join', (e) => {
      dispatch({
        type: 'RECEIVE_JOIN',
        connectionId: id,
        channel: e.channel,
        from: e.nick
      })
    })

    stream.on('names', (e) => {
      dispatch({
        type: 'RECEIVE_NAMES',
        connectionId: id,
        channel: e.channel,
        names: e.names
      })
    })

    stream.on('message', (e) => {
      if (e.message.trim().startsWith('\u0001ACTION')) {
        dispatch({
          type: 'RECEIVE_ACTION',
          connectionId: id,
          channel: equalNames(e.to, nickname) ? e.from : e.to,
          from: e.from,
          message: `${e.from} ${e.message
            /* eslint-disable no-control-regex */
            .replace(/^\u0001ACTION /, '')
            /* eslint-disable no-control-regex */
            .replace(/\u0001$/, '')}`
        })
      } else if (equalNames(e.to, nickname)) {
        dispatch({
          type: 'RECEIVE_DIRECT_MESSAGE',
          connectionId: id,
          from: e.from,
          message: e.message
        })
      } else {
        dispatch({
          type: 'RECEIVE_CHANNEL_MESSAGE',
          connectionId: id,
          channel: e.to,
          from: e.from,
          message: e.message
        })
      }
    })
  }
}

function createIrcStream({ credentials, dispatch, getState, remember }) {
  const { realName, nickname, password, server, port } = credentials
  const id = credentialsToId(credentials)

  const socket = net.connect({
    port,
    host: server
  })

  socket
    .on('timeout', () => {
      dispatch({
        type: 'REQUEST_CONNECTION_ERROR',
        connectionId: id,
        error: 'net.Socket timeout'
      })
    })
    .on('end', (e) => {
      electronLog.warn('Socket End:', e)
    })
    .on('connect', (e) => {
      const { connection } = getState().creator
      dispatch({
        type: 'REQUEST_CONNECTION_SUCCESS',
        connection: Object.assign({}, connection, {
          isConnected: true
        })
      })
      dispatch({
        type: 'WORKING_CREDENTIALS',
        credentials,
        remember
      })
    })
    .on('close', (e) => {
      // TODO: figure out how to recover
      // probably want to look at like window focus or "internet is back" events of some sort
      // then check for `ECONNRESET` errors and rebuild the stream(s)
      electronLog.info('Socket Close:', e)
      dispatch({
        type: CONNECTION_CLOSED,
        connectionId: id
      })
    })
    .on('error', (e) => {
      electronLog.error('Socket Error: ' + '[', e, ']')
      dispatch({
        type: 'REQUEST_CONNECTION_ERROR',
        connectionId: id,
        error: e.message
      })
    })

  const stream = irc(socket)

  if (password) stream.pass(password)
  stream.nick(nickname)
  stream.user(nickname, realName)

  return stream
}

const leadingChannelName = /^\[(#\S+)\]/
function getChannelFromNotice(message) {
  const match = message.match(leadingChannelName)
  return match ? match[1] : null
}
