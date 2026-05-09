/** @fileoverview Admin panel component for changing the admin dashboard password.
 * Validates that the password and confirm-password fields match before enabling
 * the Update button, preventing a mismatch from being submitted to the API. */

import './admin-component.css'

import ConfirmDialog from './confirm-dialog'
import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import {
  clearPasswordUpdated,
  setProperty
} from '../../redux'

function mapStateToProps (state) {
  const { adminError, latestPropUpdate, passwordUpdated } = state
  return { adminError, latestPropUpdate, passwordUpdated }
}

const mapDispatchToProps = {
  clearPasswordUpdated,
  setProperty
}

const displayName = 'Password'

/**
 * Admin form for setting a new admin password.
 * Both fields are validated on every keystroke using checkPassword; the Update
 * button is disabled while the fields mismatch. Both fields are empty strings
 * initially — the current password is not pre-populated for security.
 */
class Password extends Component {
  constructor (props) {
    super(props)

    this.state = {
      password: '',
      confirmPassword: '',
      error: false,
      adminError: null,
      showUpdateDialog: false
    }
  }

  componentDidMount() {
    const {adminError, passwordUpdated} = this.props
    if (adminError) {
      this.setState({adminError, showUpdateDialog: true})
    } else {
      if (passwordUpdated) {
        this.setState({showUpdateDialog: true, password: '', confirmPassword: ''})
      }
    }
  }

  componentWillReceiveProps (nextProps) {
    const {adminError, passwordUpdated} = nextProps
    if (adminError) {
      this.setState({adminError, showUpdateDialog: true})
    } else {
      if (passwordUpdated) {
        this.setState({showUpdateDialog: true, password: '', confirmPassword: ''})
      }
    }
  }

  /**
   * Returns true when the two password fields are mismatched and non-empty.
   * The leading empty-string guard prevents showing an error when the user has
   * not yet typed anything in either field.
   * @param {string} password - Value from the password field.
   * @param {string} confirm - Value from the confirm-password field.
   * @returns {boolean}
   */
  checkPassword = (password, confirm) =>
    (password !== '' || confirm !== '') && password !== confirm

  handleUpdatePassword = (evt) => {
    const password = evt.target.value
    const {confirmPassword} = this.state
    const error = this.checkPassword(password, confirmPassword)
    this.setState({password, error})
  }

  handleUpdateConfirmPassword = (evt) => {
    const confirmPassword = evt.target.value
    const {password} = this.state
    const error = this.checkPassword(password, confirmPassword)
    this.setState({confirmPassword, error})
  }

  handleUpdate = (evt) => {
    const { setProperty } = this.props
    const { password } = this.state
    setProperty('password', password)
  }

  clearDialog = () => {
    const { clearPasswordUpdated } = this.props
    this.setState({showUpdateDialog: false})
    clearPasswordUpdated()
  }

  render () {
    const { adminError, showUpdateDialog, error, password, confirmPassword } = this.state
    const className = error ? 'required' : ''
    return (
      <div className='admin-component'>
        {adminError && 
          <ConfirmDialog
          isOpen={showUpdateDialog}
          title={`${displayName} not updated`}
          body={`${adminError}`}
          handleOk={this.clearDialog}/>
        }
        {!adminError &&
          <ConfirmDialog
          isOpen={showUpdateDialog}
          title='Password Updated'
          body={`Password has been successfully updated`}
          handleOk={this.clearDialog}/>
        }
        <div className='form-inline'>
          <label>
            <input value={password} className={`${className} string form-control admin-input`} type='password' onChange={this.handleUpdatePassword}/> Password
          </label>
          <br />
          <label style={{paddingRight: '5px'}}>
            <input value={confirmPassword} className={`${className} string form-control admin-input`} type='password' onChange={this.handleUpdateConfirmPassword} /> Confirm
          </label>
          <br />
          <button className='btn btn-default' onClick={this.handleUpdate} disabled={error}>Update</button>
        </div>
      </div>
    )
  }
}

Password.propTypes = {
  adminError: PropTypes.string,
  latestPropUpdate: PropTypes.string.isRequired,
  passwordUpdated: PropTypes.bool.isRequired,
  setProperty: PropTypes.func.isRequired
}

export default connect(mapStateToProps, mapDispatchToProps)(Password)
