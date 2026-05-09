/** @fileoverview Admin panel component for configuring the HTML banner message
 * displayed at the top of the content browser. Reads and writes the
 * Client.banner field inside the ui-config property on the ConnectBox API. */

import './admin-component.css'

import { get } from 'lodash'
import { connect } from 'react-redux'
import ConfirmDialog from './confirm-dialog'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import {
  setProperty,
  getProperty
} from '../../redux'

/**
 * Selects banner-relevant state slices from Redux.
 * @param {Object} state - Full Redux state tree.
 * @returns {Object} Props including ui_config, error states, and update tracking.
 */
function mapStateToProps (state) {
  const { adminError, adminLoadError, latestPropUpdate, prop_ui_config, propertyUpdating } = state
  return { adminError, adminLoadError, ui_config: prop_ui_config, latestPropUpdate, propertyUpdating }
}

const mapDispatchToProps = {
  getProperty,
  setProperty
}

const displayName = 'Banner'

/**
 * Admin form for viewing and updating the HTML banner message shown to users.
 * The banner is stored as a field within the ui-config object property;
 * the full ui_config object must be fetched and re-submitted on save because
 * the API does not support partial updates to nested fields.
 */
class Banner extends Component {
  constructor (props) {
    super(props)
    this.state = {
      ui_config: null,
      updating: false,
      showUpdateDialog: false,
      adminError: null,
      adminLoadError: null
    }
  }

  componentWillMount () {
    this.props.getProperty('ui-config')
  }

  /**
   * Syncs incoming Redux prop changes into local component state.
   * Error conditions are prioritised first so the correct dialog title and
   * body are shown. The success dialog is only triggered when this component
   * initiated the update (this.state.updating), preventing false positives
   * from unrelated prop changes.
   * @param {Object} nextProps - Incoming props after Redux state update.
   */
  componentWillReceiveProps (nextProps) {
    const { ui_config } = nextProps
    if (nextProps.adminError) {
      this.setState({adminError: nextProps.adminError, showUpdateDialog: true})
    } else if (nextProps.adminLoadError) {
      this.setState({adminLoadError: nextProps.adminLoadError, showUpdateDialog: true})
    } else {
      // Only show the success dialog when this component triggered the update
      if (nextProps.latestPropUpdate === 'ui_config' && this.state.updating) {
        this.setState({ui_config, updating: false, showUpdateDialog: true})
      } else {
        this.setState({ui_config})
      }
    }
  }

  /**
   * Updates the banner field within the local ui_config copy as the user types.
   * Mutates the object in place before calling setState so the textarea
   * remains a controlled component without a full object clone on each keystroke.
   * @param {InputEvent} evt - Change event from the textarea.
   */
  handleInputUpdate = (evt) => {
    const banner = evt.target.value
    const { ui_config } = this.state
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
    const { adminError, adminLoadError, ui_config, showUpdateDialog } = this.state

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
          title='Banner updated'
          body={`Banner successfully updated`}
          handleOk={this.clearDialog}/>
        }
        <form className='form-inline'>
          <textarea className='string form-control' rows="4" cols="80" onChange={this.handleInputUpdate} value={get(ui_config, 'Client.banner')}></textarea><br />
          <button style={{marginTop: '10px'}}  className='btn btn-default' onClick={this.handleUpdate} disabled={propertyUpdating}>Update</button>
        </form>
      </div>
    )
  }
}

Banner.propTypes = {
  adminError: PropTypes.string,
  adminLoadError: PropTypes.string,
  ui_config: PropTypes.object,
  getProperty: PropTypes.func.isRequired,
  latestPropUpdate: PropTypes.string.isRequired,
  propertyUpdating: PropTypes.bool.isRequired,
  setProperty: PropTypes.func.isRequired
}

export default connect(mapStateToProps, mapDispatchToProps)(Banner)
