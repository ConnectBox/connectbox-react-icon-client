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
  const { latestPropUpdate, prop_channel, propertyUpdating } = state
  return { channel: prop_channel, latestPropUpdate, propertyUpdating }
}

const mapDispatchToProps = {
  getProperty,
  setProperty
}

class Channel extends Component {
  constructor (props) {
    super(props)

    this.state = {
      channel: props.channel,
      updating: false,
      showUpdateDialog: false
    }
  }

  componentWillMount () {
    this.props.getProperty('channel') // api call triggering authentication
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.latestPropUpdate === 'channel' && this.state.updating) {
      this.setState({channel: nextProps.channel, updating: false, showUpdateDialog: true})
    } else {
      this.setState({channel: nextProps.channel})
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
    setProperty('channel', channel)
  }

  clearDialog = () => {
    this.setState({showUpdateDialog: false})
  }

  render () {
    const { propertyUpdating } = this.props
    const { channel, showUpdateDialog } = this.state
    return (
      <div>
        <ConfirmDialog
          isOpen={showUpdateDialog}
          title='Wireless channel successfully updated'
          body={`Wireless channel updated to '${channel}'`}
          handleOk={this.clearDialog}/>
        <select
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
        <button onClick={this.handleUpdate} disabled={propertyUpdating}>Update</button>
      </div>
    )
  }
}

Channel.propTypes = {
  channel: PropTypes.string.isRequired,
  getProperty: PropTypes.func.isRequired,
  latestPropUpdate: PropTypes.string.isRequired,
  propertyUpdating: PropTypes.bool.isRequired,
  setProperty: PropTypes.func.isRequired
}

export default connect(mapStateToProps, mapDispatchToProps)(Channel)
