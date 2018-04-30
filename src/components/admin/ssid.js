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
  const { latestPropUpdate, prop_ssid, propertyUpdating } = state
  return { ssid: prop_ssid, latestPropUpdate, propertyUpdating }
}

const mapDispatchToProps = {
  getProperty,
  setProperty
}

class Ssid extends Component {
  constructor (props) {
    super(props)

    this.state = {
      ssid: props.ssid,
      updating: false,
      showUpdateDialog: false
    }
  }

  componentWillMount () {
    this.props.getProperty('ssid') // api call triggering authentication
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.latestPropUpdate === 'ssid' && this.state.updating) {
      this.setState({ssid: nextProps.ssid, updating: false, showUpdateDialog: true})
    } else {
      this.setState({ssid: nextProps.ssid})
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
    setProperty('ssid', ssid)
  }

  clearDialog = () => {
    this.setState({showUpdateDialog: false})
  }

  render () {
    const { propertyUpdating } = this.props
    const { ssid, showUpdateDialog } = this.state
    return (
      <div>
        <ConfirmDialog
          isOpen={showUpdateDialog}
          title={`SSID updated to '${ssid}'`}
          body='Update your wireless network settings, then click OK.'
          handleOk={this.clearDialog}/>
        <input type='text' value={ssid} onChange={this.handleInputUpdate} size='25'/>
        <button onClick={this.handleUpdate} disabled={propertyUpdating}>Update</button>
      </div>
    )
  }
}

Ssid.propTypes = {
  ssid: PropTypes.string.isRequired,
  getProperty: PropTypes.func.isRequired,
  latestPropUpdate: PropTypes.string.isRequired,
  propertyUpdating: PropTypes.bool.isRequired,
  setProperty: PropTypes.func.isRequired
}

export default connect(mapStateToProps, mapDispatchToProps)(Ssid)
