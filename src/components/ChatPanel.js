/** @fileoverview Full-screen chat panel component. Handles real-time message
 * display with automatic scroll-to-bottom (unless the user has manually
 * scrolled up), nick editing, bidirectional text direction toggling, and
 * @mention highlighting. */

import './ChatPanel.css'

import {
  clearMessageNotifications,
  saveNick,
  saveTextDirection,
  sendMessage,
  toggleChatPanel
} from '../redux'
import React, { Component } from 'react'
import PropTypes from 'prop-types'

import { connect } from 'react-redux'
import { withRouter } from 'react-router'

/**
 * Selects chat-related slices from Redux state.
 * @param {Object} state - Full Redux state tree.
 * @returns {Object} Props for messages, sent message IDs, nick, and text direction.
 */
function mapStateToProps (state) {
  const { messages, sentMessages, nick, textDirection } = state
  return { messages, sentMessages, nick, textDirection }
}

const mapDispatchToProps = {
  clearMessageNotifications,
  sendMessage,
  saveNick,
  saveTextDirection,
  toggleChatPanel
}

/**
 * Full-screen chat panel for the ConnectBox messaging feature.
 * Messages are fetched by the parent app and passed via Redux. The panel
 * auto-scrolls to the latest message unless the user has manually scrolled up,
 * supports LTR/RTL text direction per message, and highlights @nick mentions.
 */
export class ChatPanel extends Component {
  static propTypes = {
    nick: PropTypes.string.isRequired,
    messages: PropTypes.object.isRequired,
    sendMessage: PropTypes.func.isRequired,
    sentMessages: PropTypes.array.isRequired,
    textDirection: PropTypes.string.isRequired
  }

  constructor(props) {
    super(props)

    this.state = {
      editNick: false,
      messageInput: '',
      userScrolled: false
    }
  }

  componentDidMount () {
    this.props.clearMessageNotifications()
    this.updateMessagePanelScrollPosition()
  }

  componentDidUpdate () {
    this.updateMessagePanelScrollPosition()
  }

  componentWillUnmount () {
    this.props.clearMessageNotifications()
  }

  /**
   * Scrolls the messages panel to the bottom so the latest message is visible.
   * Skipped when the user has manually scrolled up to read history, preserving
   * their scroll position while new messages arrive.
   */
  updateMessagePanelScrollPosition = () => {
    if (!this.state.userScrolled) {
      const messagesPanel = document.getElementById('messages-panel')
      messagesPanel.scrollTop = messagesPanel.scrollHeight
    }
  }

  handleShowEditNick = () => {
    this.setState({ editNick: true })
  }

  /**
   * Commits a nick change when the Enter key is pressed (keyCode 13) or
   * when the input loses focus (blur event). Any other keyup event is ignored
   * so the user can still type without prematurely saving.
   * @param {KeyboardEvent|FocusEvent} evt
   */
  handleUpdateNick = (evt) => {
    if (evt.type === 'keyup' &&
        evt.keyCode !== 13) {
      return
    }

    this.setState({ editNick: false })
    this.props.saveNick(evt.target.value)
  }

  handleMessageUpdate = (evt) => {
    if (evt.type === 'keyup') {
      if (evt.keyCode === 13) {
        this.handleMessageSend()
        return
      }
    }
    this.setState({
      messageInput: evt.target.value
    })
  }

  /**
   * Dispatches the composed message to the Redux saga for delivery.
   * Guards against sending empty or whitespace-only strings to avoid
   * polluting the chat with blank messages.
   */
  handleMessageSend = () => {
    const { nick, textDirection } = this.props
    const { messageInput } = this.state
    // Do not send blank messages
    if (messageInput.trim() === '') {
      return
    }
    this.props.sendMessage({
      body: messageInput,
      nick,
      textDirection
    })
    this.setState({
      messageInput: ''
    })
  }

  handleToggleTextDirection = () => {
    this.props.saveTextDirection(this.props.textDirection === 'ltr' ? 'rtl' : 'ltr')
  }

  /**
   * Tracks whether the user has scrolled away from the bottom of the message
   * list. When the difference between scrollHeight and the visible viewport
   * bottom (scrollTop + clientHeight) is greater than zero, the user has
   * scrolled up and auto-scroll should be suppressed.
   * @param {UIEvent} evt - Scroll event from the messages-panel div.
   */
  handleScroll = (evt) => {
    const { scrollTop, scrollHeight, clientHeight } = evt.target
    this.setState({
      userScrolled: (scrollHeight - (scrollTop + clientHeight)) > 0
    })
  }

  renderNick = () => {
    const { nick } = this.props
    const { editNick } = this.state

    if (editNick) {
      return (
        <input
          id='input-nick'
          autoFocus
          type='text'
          className='input-nick'
          defaultValue={nick}
          onBlur={this.handleUpdateNick}
          onKeyUp={this.handleUpdateNick}></input>
      )
    } else {
      return (
        <div
          className='view-nick'
          onClick={this.handleShowEditNick}>
          {nick}
        </div>
      )
    }
  }

  handleCloseClick = () => {
    this.props.toggleChatPanel(false)
  }

  /**
   * Renders a single message body, wrapping and bolding the @nick mention token
   * when it appears in the text. Only the first occurrence is highlighted;
   * the surrounding text is split at that index to preserve the rest verbatim.
   * @param {Object} message - Message object with at least a `body` string.
   * @param {string} mentionToken - The string to highlight, e.g. "@Alice".
   * @returns {JSX.Element|string}
   */
  renderMessageBody = (message, mentionToken) => {
    const { body } = message
    const mentionIndex = message.body.indexOf(mentionToken)
    if (mentionIndex !== -1) {
      return (
        <span
          className='message-mention'>
          {body.substring(0, mentionIndex)}
          <strong>{mentionToken}</strong>
          {body.substring(mentionIndex + mentionToken.length)}
        </span>
      )
    } else {
      return message.body
    }
  }

  renderTextDirectionButton = () => {
    const { textDirection } = this.props
    const reversed = textDirection === 'rtl'
    return (
      <div
        className={
          `button-text-direction ${
            reversed ? 'horizontal-flip' : ''}`
        }
        onClick={this.handleToggleTextDirection}>
        <i
          className='fa fa-align-left fa-lg'
          aria-hidden='true'>
        </i>
      </div>
    )
  }

  /**
   * Renders the complete chat window with message list and input row.
   * Messages are stored as a keyed object in Redux for fast lookup by ID;
   * they are converted to an array and sorted by numeric ID here so the
   * display order matches insertion order regardless of key iteration order.
   * @returns {JSX.Element}
   */
  render () {
    const { messages = {}, sentMessages, nick } = this.props
    const { messageInput } = this.state

    // Convert the message map to a chronologically sorted array for rendering
    const messageArray =
      Object.keys(messages)
        .reduce(
          (result, key) => [...result, messages[key]], [])
        .sort(
          (a, b) => a.id - b.id)
    const mentionToken = `@${nick}`
    return (
      <div className='chat-window'>
        <div
          className='close-button'
          onClick={this.handleCloseClick}>
          <i className='fa fa-times fa-lg' aria-hidden='true'></i>
        </div>
        <div className='content'>
          <div
            id='messages-panel'
            className='messages-panel'
            onScroll={this.handleScroll}>
            <div className='spacer' />
            {messageArray.map((message, i) => {
              // Convert the Unix timestamp (seconds) to a Date for locale formatting
              const ts = new Date(0)
              ts.setUTCSeconds(message.timestamp)
              // A message is "sent" if this client sent it (by ID) OR if the
              // nick matches — the ID check handles messages sent before a
              // nick change, and the nick check covers the same-nick case.
              const isSent = sentMessages.includes(message.id) ||
                message.nick === nick
              const messageStyle = isSent ? 'sent-message' : 'message'
              const messageBodyStyle = isSent ? 'sent-message-body' : 'message-body'
              const nickStyle = isSent ? 'sent-message-nick' : 'message-nick'
              const { textDirection = 'ltr' } = message
              return (
                <div key={`msg${i}`} className={messageStyle}>
                  <div
                    key={`body${i}`}
                    className={messageBodyStyle}
                    style={{direction: textDirection}}>
                    {this.renderMessageBody(message, mentionToken)}
                  </div>
                  <div key={`nick${i}`} className={nickStyle}>
                    {ts.toLocaleDateString()} {ts.toLocaleTimeString()} - {message.nick}
                  </div>
                </div>
                )
              }
            )}
            <div className='message-panel-bottom'>
            </div>
          </div>
          <div className='input-panel'>
            {this.renderNick()}
            {this.renderTextDirectionButton()}
            <input
              type='text'
              className='input-message'
              onChange={this.handleMessageUpdate}
              onKeyUp={this.handleMessageUpdate}
              style={{direction: this.props.textDirection}}
              value={messageInput}
              autoFocus
              ></input>
            <div className='button-send' onClick={this.handleMessageSend}>
              <i className='fa fa-arrow-right fa-lg' aria-hidden='true'></i>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(ChatPanel))
