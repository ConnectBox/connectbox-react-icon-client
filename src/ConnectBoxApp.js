/** @fileoverview Root application component. Manages top-level routing between
 * the admin panel and the content browser, handles scroll-to-top behaviour,
 * bootstraps nick/text-direction fetch on mount, and polls for new chat
 * messages every 3 s except when the admin panel is active. */

/* global window */
import './ConnectBoxApp.css'

import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import queryString from 'query-string'
import { Redirect, Route, Switch, withRouter } from 'react-router'

import {
  fetchNick,
  fetchTextDirection,
  getContent,
  getMessages,
  getNewMessages,
  setConfigPath,
  toggleChatPanel
} from './redux'
import ChatPanel from './components/ChatPanel'
import NavigationBar from './components/NavigationBar'
import PopularFileList from './components/PopularFileList'
import RootFolderList from './components/RootFolderList'
import FolderList from './components/FolderList'
import Footer from './components/Footer'
import AdminPanel from './components/admin/dashboard'

/**
 * Selects the subset of Redux state needed by ConnectBoxApp.
 * @param {Object} state - Full Redux state tree.
 * @returns {Object} Props derived from state.
 */
function mapStateToProps (state) {
  const {
    chatPanelShowing,
    chatOffline,
    content,
    contentPath,
    config,
    error,
    iconMetadata,
    loading,
    mention,
    newMessages,
    popularFiles,
    topLevelFiles
  } = state
  return {
    chatPanelShowing,
    chatOffline,
    content,
    contentPath,
    config,
    error,
    iconMetadata,
    loading,
    mention,
    newMessages,
    popularFiles,
    topLevelFiles
  }
}

const mapDispatchToProps = {
  fetchNick,
  fetchTextDirection,
  getContent,
  getMessages,
  getNewMessages,
  setConfigPath,
  toggleChatPanel
}

/**
 * Root application component for the ConnectBox icon client.
 * Handles top-level routing (admin vs content browser), smooth scroll-to-top,
 * chat panel visibility, and periodic new-message polling.
 */
export class ConnectBoxApp extends Component {
    static propTypes = {
        chatPanelShowing: PropTypes.bool.isRequired,
        config: PropTypes.object.isRequired,
        content: PropTypes.array.isRequired,
        error: PropTypes.object,
        getContent: PropTypes.func.isRequired,
        getMessages: PropTypes.func.isRequired,
        getNewMessages: PropTypes.func.isRequired,
        history: PropTypes.object.isRequired,
        iconMetadata: PropTypes.object.isRequired,
        loading: PropTypes.bool.isRequired,
        location: PropTypes.object.isRequired,
        mention: PropTypes.bool.isRequired,
        newMessages: PropTypes.bool.isRequired,
        popularFiles: PropTypes.array,
        setConfigPath: PropTypes.func.isRequired,
        toggleChatPanel: PropTypes.func.isRequired,
        topLevelFiles: PropTypes.array
    }

    constructor (props) {
        super(props)

        this.state = {showScrollToTop: false};

        this.scrollListener = this.scrollListener.bind(this)
        this.scrollToTop = this.scrollToTop.bind(this)
        this.reload = this.reload.bind(this)
    }

    /**
     * Handles window scroll events and shows/hides the scroll-to-top button.
     * A 500 ms debounce timer is reset on each event to avoid setState storms
     * during fast scrolling; Function.prototype is used as a no-op callback
     * because we only need the side-effect of the timeout, not its result.
     */
    scrollListener () {
      this.scrollDebounce && clearTimeout(this.scrollDebounce)
      this.setState({
        showScrollToTop: window.scrollY > 150
      })
      this.scrollDebounce = setTimeout(Function.prototype, 500)
    }

    /**
     * Smoothly scrolls the page to the top using an exponential-decay
     * animation that fires every 10 ms. Multiplying the current Y position
     * by 0.6 each frame produces a deceleration effect; the interval is
     * cleared once the position drops below 100 px to avoid an infinite loop
     * creeping toward zero.
     * @param {Event} e - Click event from the scroll-to-top button.
     */
    scrollToTop (e) {
      this.scrollTicker && clearInterval(this.scrollTicker);
      this.scrollTicker = setInterval(() => {
              var y = 0.6 * window.scrollY;
              if (y < 100) {
                  y = 0;
                  clearInterval(this.scrollTicker);
              }
              window.scrollTo(0, y);
          }, 10);
      e.preventDefault()
    }

    /**
     * Lifecycle: runs after the component first mounts.
     * Fetches the user's nick and text direction from the server, loads the
     * initial content based on the URL hash, registers a history listener so
     * hash changes load new content without a full page reload, attaches the
     * scroll listener, performs an initial message fetch, and starts the 3-second
     * polling interval for new chat messages.
     */
    componentDidMount () {
      this.props.fetchNick()
      this.props.fetchTextDirection()
      this.props.getContent(this.props.location.hash.substring(1))
      // Listen for hash-based navigation changes (content is addressed by hash)
      this.historyUnlisten = this.props.history.listen((location, action) => {
        this.props.getContent(location.hash.substring(1))
      });

      window.addEventListener('scroll', this.scrollListener)

      this.props.getMessages()
      this.refreshInterval = setInterval(this.refreshMessages, 3000)
    }

    componentWillUnmount () {
      clearInterval(this.refreshInterval)
      if (this.historyUnlisten) {
        this.historyUnlisten()
      }
      window.removeEventListener('scroll', this.scrollListener)
    }

    componentWillMount () {
      const queryParams = queryString.parse(this.props.location.search)
      this.props.setConfigPath(queryParams.config)
    }

    /**
     * Called by the polling interval every 3 s. Skips the fetch when the user
     * is inside the admin panel to avoid unnecessary API traffic while
     * configuring the device.
     */
    refreshMessages = () => {
      if (!this.props.location.pathname.startsWith('/admin/')) {
        this.props.getNewMessages()
      }
    }

    /**
     * Re-fetches the current content directory without changing the URL.
     * Called by the NavigationBar refresh button.
     * @param {Event} e - Click event; prevented to avoid anchor navigation.
     */
    reload (e) {
      const { contentPath, getContent } = this.props
      getContent(contentPath)
      e.preventDefault()
    }

    /**
     * Handles clicks on the chat button. Silently ignores the click when the
     * chat server is offline so the user doesn't see a broken panel.
     */
    onChatClick = () => {
      const { chatOffline } = this.props
      if (chatOffline) {
        return
      }
      this.props.toggleChatPanel(true)
    }

    renderChat = () => {
      return (
        <ChatPanel />
      )
    }

    /**
     * Renders the optional HTML banner configured in brand.j2 under
     * Client.banner. dangerouslySetInnerHTML is used intentionally because the
     * banner is an admin-supplied HTML string (not user-supplied content).
     * Returns null when no banner is configured.
     * @returns {JSX.Element|null}
     */
    banner () {
      const { banner } = this.props.config.Client

      if (banner) {
        return (<div dangerouslySetInnerHTML={{__html: banner}}></div>)
      }

      return null
    }

    /**
     * Renders the floating chat icon button in the top-right corner.
     * Three overlapping icon layers are used to implement animated pulsing for
     * new messages and a distinct colour for @mentions. The layers are toggled
     * via CSS classes and inline display style rather than conditional rendering
     * so CSS transitions apply correctly.
     * @returns {JSX.Element}
     */
    renderChatButton = () => {
      const { mention, newMessages, chatOffline } = this.props
      const newMessageOnClass = !mention && newMessages ? 'chat-new-message-on' : ''
      const newMessageOffClass = !mention && newMessages ? 'chat-new-message-off' : ''
      const mentionClass = mention ? 'chat-mention' : ''
      const chatOfflineClass = chatOffline ? 'chat-offline' : ''
      return (
        <div className='chat-button' onClick={this.onChatClick}>
          <i
            style={{position: 'absolute', top: 0, right: 10, display: !mention && newMessages ? 'block' : 'none'}}
            className={`fa fa-comments-o fa-lg chat-icon ${newMessageOnClass} ${chatOfflineClass}`}
            aria-hidden='true'></i>
          <i
            style={{position: 'absolute', top: 0, right: 10, display: !mention && newMessages ? 'block' : 'none'}}
            className={`fa fa-comments fa-lg chat-icon ${newMessageOffClass} ${chatOfflineClass}`}
            aria-hidden='true'></i>
          <i
            style={{position: 'absolute', top: 0, right: 10, display: !newMessages ? 'block' : 'none'}}
            className={`fa fa-comments fa-lg chat-icon ${mentionClass} ${chatOfflineClass}`}
            aria-hidden='true'></i>
        </div>
      )
    }

    /**
     * Renders the main content browser: navigation bar, optional banner,
     * scroll-to-top button, folder/file lists, and footer.
     * The view switches between RootFolderList (icon grid) and FolderList
     * (table) based on whether contentPath is the root. Top-level loose files
     * and popular-files lists are only shown at the root path.
     * @returns {JSX.Element}
     */
    renderContent = () => {
      const {showScrollToTop} = this.state
      const { content, contentPath, config, error, iconMetadata, topLevelFiles, loading, popularFiles } = this.props

      // The root is either an empty string (initial load) or a bare slash
      const isRoot = contentPath === '' || contentPath === '/'

      return (
        <div style={{height: 'calc(100%)'}}>
          {this.banner()}
          <div className="content-panel">
            {showScrollToTop &&
              <div className="pull-right" id="scroll-to-top">
              <a role="button" onClick={this.scrollToTop}><i className="fa fa-long-arrow-up"></i> to top</a></div>
            }

            <div className="navigation-bar">
                <NavigationBar
                  contentPath={contentPath}
                  reload={this.reload}
                  loading={loading}/>
                {this.renderChatButton()}
            </div>


              {!error && isRoot &&
                <div style={{marginTop: "3em"}}>
                  <RootFolderList
                    iconMetadata={iconMetadata}
                    contentRoot={config.Content.contentRoute}
                    displayFolderName={config.Client.display_root_folder_names}
                    content={content}
                    />
                </div>
              }

              {!error && !isRoot &&
                <div style={{marginTop: "3em"}}>
                    <FolderList
                      iconMetadata={iconMetadata}
                      folderPath={contentPath}
                      contentRoot={config.Content.contentRoute}
                      content={content}/>
                </div>
              }

              {!error && isRoot && topLevelFiles &&
                <div>
                    <FolderList
                      iconMetadata={iconMetadata}
                      folderPath=''
                      contentRoot={config.Content.contentRoute}
                      content={topLevelFiles}/>
                </div>
              }

              {!error && popularFiles && popularFiles.length > 0 && isRoot &&
                  <div>
                      <PopularFileList popularFiles={popularFiles}/>
                  </div>
              }

              {error &&
                <div style={{marginTop: '60px'}}>
                      <div className="alert alert-danger" role="alert">
                          <big>
                              Error occurred: "{ error || 'Unexpected error' }"
                          </big>
                      </div>
                  </div>
              }
            <div className='spacer' />
            <Footer />
          </div>
        </div>
      )
    }

  /**
   * Top-level render. Routes /admin/ to the AdminPanel, redirects /admin
   * (no trailing slash) to /admin/, and renders either the chat panel or
   * content browser for all other paths based on chatPanelShowing state.
   * The strict /admin/ route requires the trailing slash so the admin component
   * can use relative sub-routes without an extra redirect layer.
   * @returns {JSX.Element}
   */
  render () {
    const { chatPanelShowing } = this.props

    return (
      <Switch>
        <Route strict path='/admin/' component={AdminPanel} />

        <Route exact path='/admin' >
          <Redirect to="/admin/" />
        </Route>

        <Route render={props => (chatPanelShowing ? this.renderChat() : this.renderContent())} />
      </Switch>
    )
  }
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(ConnectBoxApp))
