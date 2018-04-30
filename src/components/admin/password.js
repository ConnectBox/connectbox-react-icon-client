import './admin-component.css'

import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import {
  setProperty
} from '../../redux'

function mapStateToProps (state) {
  const { adminProps } = state
  return { adminProps }
}

const mapDispatchToProps = {
  setProperty
}

class Password extends Component {
  constructor (props) {
    super(props)

    this.state = {
      password: null,
      confirmPassword: null,
      error: false
    }
  }

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

  handleUpdate = () => {
    const { setProperty } = this.props
    const { password } = this.state

    setProperty('password', password)
  }

  render () {
    const { error } = this.state
    const className = error ? 'required' : ''
    return (
      <div>
        <input className={className} type='password' onChange={this.handleUpdatePassword}/>
        <input className={className} type='password' onChange={this.handleUpdateConfirmPassword} />
        <button onClick={this.handleUpdate} disabled={error}>Update</button>
      </div>
    )
  }
}

Password.propTypes = {
  adminProps: PropTypes.object.isRequired,
  setProperty: PropTypes.func.isRequired
}

export default connect(mapStateToProps, mapDispatchToProps)(Password)
