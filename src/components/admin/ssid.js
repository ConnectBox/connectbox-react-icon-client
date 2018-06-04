import './admin-component.css'

import { connect } from 'react-redux'
import ConfirmDialog from './confirm-dialog'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import {
  setProperty,
  getProperty
} from '../../redux'

function mapStateToProps (state) {
  const { adminError, adminLoadError, latestPropUpdate, prop_ssid, propertyUpdating, propertyTimeoutWait } = state
  return { adminError, adminLoadError, ssid: prop_ssid, latestPropUpdate, propertyUpdating, propertyTimeoutWait }
}

const mapDispatchToProps = {
  getProperty,
  setProperty
}

const displayName = 'SSID'

class Ssid extends Component {
  constructor (props) {
    super(props)

    this.state = {
      ssid: props.ssid,
      updating: false,
      showUpdateDialog: false,
      adminError: null,
      adminLoadError: null
    }
  }

  componentWillMount () {
    this.props.getProperty('ssid') // api call triggering authentication
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.adminError) {
      this.setState({adminError: nextProps.adminError, showUpdateDialog: true})
    } else if (nextProps.adminLoadError) {
      this.setState({adminLoadError: nextProps.adminLoadError, showUpdateDialog: true})
    } else {
      if (nextProps.latestPropUpdate === 'ssid' && this.state.updating) {
        this.setState({ssid: nextProps.ssid, updating: false, showUpdateDialog: true})
      } else {
        this.setState({ssid: nextProps.ssid})
      }
    }
  }

  handleInputUpdate = (evt) => {
    const ssid = evt.target.value
    this.setState({ssid})
  }

  handleUpdate = () => {
    const { setProperty } = this.props
    const { ssid } = this.state
    this.setState({updating: true})
    setProperty('ssid', ssid, true, 5000, 10000)
  }

  clearDialog = () => {
    this.setState({showUpdateDialog: false})
  }

  render () {
    const { propertyUpdating } = this.props
    const { adminError, adminLoadError, ssid, showUpdateDialog } = this.state
    return (
      <div className='admin-component'>
        {adminError && 
          <ConfirmDialog
          isOpen={showUpdateDialog}
          title={`${displayName} not updated`}
          body={`${adminError}`}
          handleOk={this.clearDialog}/>
        }
        {adminLoadError && 
          <ConfirmDialog
          isOpen={showUpdateDialog}
          title={`Unable to load ${displayName} setting`}
          body={`${adminLoadError}`}
          handleOk={this.clearDialog}/>
        }
        {!adminError &&
          <ConfirmDialog
            isOpen={showUpdateDialog}
            title={`SSID updated to '${ssid}'`}
            body='Update your wireless network settings, then click OK.'
            handleOk={this.clearDialog}/>
        }
        <form className='form-inline'>
          <input
              className='string form-control admin-input'
              type='text'
              value={ssid}
              onChange={this.handleInputUpdate}/>
          <button
            className='btn btn-default'
            placeholder='Enter SSID'
            onClick={this.handleUpdate}
            disabled={propertyUpdating}>Update</button>
        </form>
      </div>
    )
  }
}

Ssid.propTypes = {
  adminError: PropTypes.string,
  adminLoadError: PropTypes.string,
  ssid: PropTypes.string.isRequired,
  getProperty: PropTypes.func.isRequired,
  latestPropUpdate: PropTypes.string.isRequired,
  propertyUpdating: PropTypes.bool.isRequired,
  propertyTimeoutWait: PropTypes.bool.isRequired,
  setProperty: PropTypes.func.isRequired
}

export default connect(mapStateToProps, mapDispatchToProps)(Ssid)
