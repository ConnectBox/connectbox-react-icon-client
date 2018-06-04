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
  const { adminError, adminLoadError, latestPropUpdate, prop_channel, propertyUpdating } = state
  return { adminError, adminLoadError, channel: prop_channel, latestPropUpdate, propertyUpdating }
}

const mapDispatchToProps = {
  getProperty,
  setProperty
}

const displayName = 'Channel'

class Channel extends Component {
  constructor (props) {
    super(props)

    this.state = {
      channel: props.channel,
      updating: false,
      showUpdateDialog: false,
      adminError: null,
      adminLoadError: null
    }
  }

  componentWillMount () {
    this.props.getProperty('channel') // api call triggering authentication
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.adminError) {
      this.setState({adminError: nextProps.adminError, showUpdateDialog: true})
    } else if (nextProps.adminLoadError) {
      this.setState({adminLoadError: nextProps.adminLoadError, showUpdateDialog: true})
    } else {
      if (nextProps.latestPropUpdate === 'channel' && this.state.updating) {
        this.setState({channel: nextProps.channel, updating: false, showUpdateDialog: true})
      } else {
        this.setState({channel: nextProps.channel})
      }
    }
  }

  handleInputUpdate = (evt) => {
    const channel = evt.target.value
    this.setState({channel})
  }

  handleUpdate = () => {
    const { setProperty } = this.props
    const { channel } = this.state
    this.setState({updating: true})
    setProperty('channel', channel, true, 1)
  }

  clearDialog = () => {
    this.setState({showUpdateDialog: false})
  }

  render () {
    const { propertyUpdating } = this.props
    const { adminError, adminLoadError, channel, showUpdateDialog } = this.state
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
          title='Wireless channel successfully updated'
          body={`Wireless channel updated to '${channel}'`}
          handleOk={this.clearDialog}/>
        }
        <form className='form-inline'>
          <select
            className="string form-control admin-input"
            onChange={this.handleInputUpdate}
            value={channel}>
            <option>1</option>
            <option>2</option>
            <option>3</option>
            <option>4</option>
            <option>5</option>
            <option>6</option>
            <option>7</option>
            <option>8</option>
            <option>9</option>
            <option>10</option>
            <option>11</option>
          </select>
          <button 
            className='btn btn-default'
            onClick={this.handleUpdate} 
            disabled={propertyUpdating}>Update</button>
        </form>
      </div>
    )
  }
}

Channel.propTypes = {
  adminError: PropTypes.string,
  adminLoadError: PropTypes.string,
  channel: PropTypes.string.isRequired,
  getProperty: PropTypes.func.isRequired,
  latestPropUpdate: PropTypes.string.isRequired,
  propertyUpdating: PropTypes.bool.isRequired,
  setProperty: PropTypes.func.isRequired
}

export default connect(mapStateToProps, mapDispatchToProps)(Channel)
