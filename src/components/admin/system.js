import './admin-component.css'

import { connect } from 'react-redux'
import ConfirmDialog from './confirm-dialog'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import {
  triggerEvent
} from '../../redux'

function mapStateToProps (state) {
  const { latestPropUpdate, propertyUpdating } = state
  return { latestPropUpdate, propertyUpdating }
}

const mapDispatchToProps = {
  triggerEvent
}

class System extends Component {
  constructor (props) {
    super(props)

    this.state = {
      option: 'unmountusb',
      updating: false,
      showUpdateDialog: false
    }
  }


  componentWillReceiveProps (nextProps) {
    if (this.state.updating) {
      this.setState({updating: false, showUpdateDialog: true})
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
    const { option, showUpdateDialog } = this.state

    let action
    let body
    if (option === 'unmountusb') {
      action = 'Unmounting USB'
      body = 'Unmounting USB successfully initiated'
    } else if (option === 'shutdown') {
      action = 'Performing system shutdown'
      body = 'System shutdown successfully initiated'
    } else if (option === 'reboot') {
      action = 'Performing system reboot'
      body = 'System reboot successfully initiated'
    } else if (option === 'reset') {
      action = 'Performing system reset'
      body = 'System reset successfully initiated'
    }
    return (
      <div>
        <ConfirmDialog
          isOpen={showUpdateDialog}
          title={`${action}`}
          body={`${body}`}
          handleOk={this.clearDialog}/>
        <form>
          <label>
            <input type='radio' value='unmountusb' checked={option === 'unmountusb'} onChange={this.handleInputUpdate}/> Unmount USB
          </label>
          <label>
            <input type='radio' value='shutdown' checked={option === 'shutdown'} onChange={this.handleInputUpdate}/> Shutdown
          </label>
          <label>
            <input type='radio' value='reboot' checked={option === 'reboot'} onChange={this.handleInputUpdate}/> Reboot
          </label>
          <label>
            <input type='radio' value='reset' checked={option === 'reset'} onChange={this.handleInputUpdate}/> Reset
          </label>
        </form>
        <button onClick={this.handleUpdate} disabled={propertyUpdating}>Update</button>
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
