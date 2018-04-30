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
  const { latestPropUpdate, prop_ui_config, propertyUpdating } = state
  return { ui_config: prop_ui_config, latestPropUpdate, propertyUpdating }
}

const mapDispatchToProps = {
  getProperty,
  setProperty
}

class Banner extends Component {
  constructor (props) {
    super(props)

    this.state = {
      ui_config: { Client: { banner: ''} },
      updating: false,
      showUpdateDialog: false
    }
  }

  componentWillMount () {
    this.props.getProperty('ui-config')
  }

  componentWillReceiveProps (nextProps) {
    const ui_config = nextProps.ui_config
    if (nextProps.latestPropUpdate === 'ui_config' && this.state.updating) {
      this.setState({ui_config, updating: false, showUpdateDialog: true})
    } else {
      this.setState({ui_config})
    }
  }

  handleInputUpdate = (evt) => {
    const banner = evt.target.value
    const ui_config = this.state.ui_config
    ui_config.Client.banner = banner
    this.setState({ui_config})
  }

  handleUpdate = () => {
    const { setProperty } = this.props
    const { ui_config } = this.state
    this.setState({updating: true})
    setProperty('ui-config', ui_config, false)
  }

  clearDialog = () => {
    this.setState({showUpdateDialog: false})
  }

  render () {
    const { propertyUpdating } = this.props
    const { ui_config, showUpdateDialog } = this.state

    return (
      <div>
        <ConfirmDialog
          isOpen={showUpdateDialog}
          title='Banner updated'
          body={`Banner successfully updated`}
          handleOk={this.clearDialog}/>
        <textarea rows="4" cols="80" onChange={this.handleInputUpdate} value={ui_config.Client.banner}></textarea>
        <button onClick={this.handleUpdate} disabled={propertyUpdating}>Update</button>
      </div>
    )
  }
}

Banner.propTypes = {
  ui_config: PropTypes.object.isRequired,
  getProperty: PropTypes.func.isRequired,
  latestPropUpdate: PropTypes.string.isRequired,
  propertyUpdating: PropTypes.bool.isRequired,
  setProperty: PropTypes.func.isRequired
}

export default connect(mapStateToProps, mapDispatchToProps)(Banner)
