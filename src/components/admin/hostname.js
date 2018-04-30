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
  const { latestPropUpdate, prop_hostname, propertyUpdating } = state
  return { hostname: prop_hostname, latestPropUpdate, propertyUpdating }
}

const mapDispatchToProps = {
  getProperty,
  setProperty
}

class Hostname extends Component {
  constructor (props) {
    super(props)

    this.state = {
      hostname: props.hostname,
      updating: false,
      showUpdateDialog: false
    }
  }

  componentWillMount () {
    this.props.getProperty('hostname') // api call triggering authentication
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.latestPropUpdate === 'hostname' && this.state.updating) {
      this.setState({hostname: nextProps.hostname, updating: false, showUpdateDialog: true})
    } else {
      this.setState({hostname: nextProps.hostname})
    }
  }

  handleInputUpdate = (evt) => {
    const hostname = evt.target.value
    this.setState({hostname})
  }

  handleUpdate = () => {
    const { setProperty } = this.props
    const { hostname } = this.state
    this.setState({updating: true})
    setProperty('hostname', hostname)
  }

  clearDialog = () => {
    const { path } = this.props
    const { hostname } = this.state
    window.location.href = `http://${hostname}/${path}`
  }

  render () {
    const { propertyUpdating } = this.props
    const { hostname, showUpdateDialog } = this.state

    return (
      <div>
        <ConfirmDialog
          isOpen={showUpdateDialog}
          title={`Host name updated to '${hostname}'`}
          body={`Host name updated to ${hostname}, click OK to continue`}
          handleOk={this.clearDialog}/>
        <input type='text' value={hostname} onChange={this.handleInputUpdate} size='25'/>
        <button onClick={this.handleUpdate} disabled={propertyUpdating}>Update</button>
      </div>
    )
  }
}

Hostname.propTypes = {
  hostname: PropTypes.string.isRequired,
  getProperty: PropTypes.func.isRequired,
  latestPropUpdate: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,
  propertyUpdating: PropTypes.bool.isRequired,
  setProperty: PropTypes.func.isRequired
}

export default connect(mapStateToProps, mapDispatchToProps)(Hostname)
