/** @fileoverview Admin login form component. Submits the admin password to the
 * Redux authenticate action and watches for an authorization failure by
 * detecting when the authentication cycle completes without an authorization
 * token in Redux state. */

import './admin-component.css'
import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import {
  authenticate
} from '../../redux'

function mapStateToProps (state) {
  const { authorization } = state
  return { authorization }
}

const mapDispatchToProps = {
  authenticate
}

/**
 * Admin password entry form. Tracks a local authenticating flag to disable
 * the Login button while the request is in flight and detects failure by
 * observing that the authorization prop remains null after the request cycle
 * completes, then shows a visual error state on the password field.
 */
class Login extends Component {
  constructor (props) {
    super(props)

    this.state = {
      authenticating: false,
      authenticationError: false,
      password: ''
    }
  }

  /**
   * Detects a failed login attempt: if we were in the authenticating state and
   * the next props still have no authorization token, the server rejected the
   * password. Sets authenticationError to visually highlight the input field.
   * @param {Object} nextProps - Incoming props after Redux state update.
   */
  componentWillReceiveProps (nextProps) {
    const { authenticating } = this.state
    const { authorization } = nextProps
    // A completed auth cycle with no token means the password was wrong
    if (authenticating && !authorization) {
      this.setState({authenticating: false, authenticationError: true})
    }
  }

  handlePasswordChange = (evt) => {
    const password = evt.target.value
    this.setState({password})
  }

  handleAuthenticate = () => {
    const { authenticate } = this.props
    const { password } = this.state
    this.setState({authenticating: true, authenticationError: false})
    authenticate(password)
  }

  /**
   * Renders the password input and login button.
   * The 'required' CSS class gives the input a red border when credentials
   * were incorrect, using Bootstrap's built-in form validation styling.
   * @returns {JSX.Element}
   */
  render () {
    const { authenticating, authenticationError, password } = this.state
    // Apply Bootstrap's 'required' class to visually flag a failed attempt
    const className = authenticationError ? 'required' : ''
    return (
      <div>
        <div>
          <span></span>
          <label>
            <input
              className={className}
              type='password'
              value={password}
              onChange={this.handlePasswordChange} />
            Password
          </label>
        </div>
        <button
          className='btn btn-default'
          onClick={this.handleAuthenticate}
          disabled={authenticating}>Login</button>
      </div>
    )
  }
}

Login.propTypes = {
  authorization: PropTypes.string,
  authenticate: PropTypes.func.isRequired
}

export default connect(mapStateToProps, mapDispatchToProps)(Login)
