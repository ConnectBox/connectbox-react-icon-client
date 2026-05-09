/** @fileoverview Admin panel component for triggering system-level operations:
 * USB unmount, shutdown, reboot, and factory reset. Each action dispatches a
 * triggerEvent Redux action and shows a confirmation dialog after completion.
 * The dialog body and title are built dynamically from the selected option
 * and the success/error state. */

import './admin-component.css'

import { connect } from 'react-redux'
import ConfirmDialog from './confirm-dialog'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import {
  triggerEvent
} from '../../redux'

/**
 * Selects system-action state slices from Redux.
 * @param {Object} state - Full Redux state tree.
 * @returns {Object} Props for error state, latest update key, and updating flag.
 */
function mapStateToProps (state) {
  const { adminError, latestPropUpdate, propertyUpdating } = state
  return { adminError, latestPropUpdate, propertyUpdating }
}

const mapDispatchToProps = {
  triggerEvent
}

/**
 * Admin panel for one-shot system actions (unmount USB, shutdown, reboot, reset).
 * The option radio buttons control what triggerEvent dispatches. Dialog title and
 * body are computed at render time from the selected option so a single
 * ConfirmDialog handles all four outcomes.
 */
class System extends Component {
  constructor (props) {
    super(props)

    this.state = {
      adminError: null,
      option: 'unmountusb',
      updating: false,
      showUpdateDialog: false
    }
  }


  componentWillReceiveProps (nextProps) {
    if (nextProps.adminError) {
      this.setState({adminError: nextProps.adminError, showUpdateDialog: true})
    } else {
      if (this.state.updating) {
        this.setState({updating: false, showUpdateDialog: true})
      }
    }
  }

  handleInputUpdate = (evt) => {
    const option = evt.target.value
    this.setState({option})
  }

  handleUpdate = () => {
    const { triggerEvent } = this.props
    const { option } = this.state
    this.setState({updating: true})
    triggerEvent('system', option)
  }

  clearDialog = () => {
    this.setState({showUpdateDialog: false})
  }

  render () {
    const { propertyUpdating } = this.props
    const { adminError, option, showUpdateDialog } = this.state

    // Compose dialog strings from the selected option and success/error state
    const titleMessage = adminError ? 'Error ' : ''
    const bodyMessage = adminError ? 'not initiated' : 'successfully initiated'
    let action
    let body
    if (option === 'unmountusb') {
      action = `${titleMessage}Unmounting USB`
      body = `Unmounting USB ${bodyMessage}`
    } else if (option === 'shutdown') {
      action = `${titleMessage}Performing system shutdown`
      body = `System shutdown ${bodyMessage}`
    } else if (option === 'reboot') {
      action = `${titleMessage}Performing system reboot`
      body = `System reboot ${bodyMessage}`
    } else if (option === 'reset') {
      action = `${titleMessage}Performing system reset`
      body = `System reset ${bodyMessage}`
    }
    return (
      <div className='admin-component'>
        <ConfirmDialog
          isOpen={showUpdateDialog}
          title={`${action}`}
          body={`${body}`}
          handleOk={this.clearDialog}/>
        <form className='form'>
          <div className='form-group' style={{paddingRight: '5px'}}>
            <label>
              <input type='radio' value='unmountusb' checked={option === 'unmountusb'} onChange={this.handleInputUpdate}/> Unmount USB
            </label>
          </div>
          <div className='form-group' style={{paddingRight: '5px'}}>
          <label>
            <input type='radio' value='shutdown' checked={option === 'shutdown'} onChange={this.handleInputUpdate}/> Shutdown
          </label>
          </div>
          <div className='form-group' style={{paddingRight: '5px'}}>
          <label>
            <input type='radio' value='reboot' checked={option === 'reboot'} onChange={this.handleInputUpdate}/> Reboot
          </label>
          </div>
          <div className='form-group' style={{paddingRight: '5px'}}>
          <label>
            <input type='radio' value='reset' checked={option === 'reset'} onChange={this.handleInputUpdate}/> Reset
          </label>
          </div>
        </form>
        <button className='btn btn-default' onClick={this.handleUpdate} disabled={propertyUpdating}>Execute</button>
      </div>
    )
  }
}

System.propTypes = {
  latestPropUpdate: PropTypes.string.isRequired,
  propertyUpdating: PropTypes.bool.isRequired,
  triggerEvent: PropTypes.func.isRequired
}

export default connect(mapStateToProps, mapDispatchToProps)(System)
