import './ChatPanel.css'

import {
  clearMention,
  fetchNick,
  saveNick,
  sendMessage,
  toggleChatPanel
} from '../redux'
import React, { Component } from 'react'
import PropTypes from 'prop-types'

import { connect } from 'react-redux'
import { withRouter } from 'react-router'

function mapStateToProps (state) {
  const { messages, sentMessages, nick } = state
  return { messages, sentMessages, nick }
}

const mapDispatchToProps = {
  clearMention,
  sendMessage,
  fetchNick,
  saveNick,
  toggleChatPanel
}

export class ChatPanel extends Component {
  static propTypes = {
    nick: PropTypes.string.isRequired,
    messages: PropTypes.object.isRequired,
    sendMessage: PropTypes.func.isRequired,
    sentMessages: PropTypes.array.isRequired
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
    this.props.clearMention()
  }

  componentDidUpdate () {
    if (!this.state.userScrolled) {
      const messagesPanel = document.getElementById('messages-panel')
      messagesPanel.scrollTop = messagesPanel.scrollHeight
    }
  }

  componentWillUnmount () {
  }

  handleShowEditNick = () => {
    this.setState({ editNick: true })
  }

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

  handleMessageSend = () => {
    const { nick } = this.props
    const { messageInput } = this.state
    if (messageInput.trim() === '') {
      return
    }
    this.props.sendMessage({
      nick, body: messageInput
    })
    this.setState({
      messageInput: ''
    })
  }

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

  renderMessageBody = (message, mentionToken) => {
    const { body } = message
    const mentionIndex = message.body.indexOf(mentionToken)
    if (mentionIndex !== -1) {
      return (
        <span className='message-mention'>
          {body.substring(0, mentionIndex)}
          <strong>{mentionToken}</strong>
          {body.substring(mentionIndex + mentionToken.length)}
        </span>
      )
    } else {
      return message.body
    }
  }

  render () {
    const { messages = {}, sentMessages, nick } = this.props
    const { messageInput } = this.state

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
              const ts = new Date(0)
              ts.setUTCSeconds(message.timestamp)
              const isSent = sentMessages.includes(message.id) ||
                message.nick === nick
              const messageStyle = isSent ? 'sent-message' : 'message'
              const messageBodyStyle = isSent ? 'sent-message-body' : 'message-body'              
              return (
                <div key={`msg${i}`} className={messageStyle}>
                  <div key={`body${i}`} className={messageBodyStyle}>
                    {this.renderMessageBody(message, mentionToken)}
                  </div>
                  <div key={`nick${i}`} className='message-nick'>
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
            <input
              type='text'
              className='input-message'
              onChange={this.handleMessageUpdate}
              onKeyUp={this.handleMessageUpdate}
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
