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
  const { latestPropUpdate, prop_staticsite, propertyUpdating } = state
  return { staticsite: prop_staticsite, latestPropUpdate, propertyUpdating }
}

const mapDispatchToProps = {
  getProperty,
  setProperty
}

class StaticSite extends Component {
  constructor (props) {
    super(props)

    this.state = {
      staticsite: props.staticsite,
      updating: false,
      showUpdateDialog: false
    }
  }

  componentWillMount () {
    this.props.getProperty('staticsite') // api call triggering authentication
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.latestPropUpdate === 'staticsite' && this.state.updating) {
      this.setState({staticsite: nextProps.staticsite, updating: false, showUpdateDialog: true})
    } else {
      this.setState({staticsite: nextProps.staticsite})
    }
  }

  handleInputUpdate = (evt) => {
    const staticsite = evt.target.value
    this.setState({staticsite})
  }

  handleUpdate = () => {
    const { setProperty } = this.props
    const { staticsite } = this.state
    this.setState({updating: true})
    setProperty('staticsite', staticsite)
  }

  clearDialog = () => {
    this.setState({showUpdateDialog: false})
  }

  render () {
    const { propertyUpdating } = this.props
    const { staticsite, showUpdateDialog } = this.state
    return (
      <div>
        <ConfirmDialog
          isOpen={showUpdateDialog}
          title={`Static site ${staticsite ? 'enabled' : 'disabled'}`}
          body={`Static site is now ${staticsite ? 'enabled' : 'disabled'}`}
          handleOk={this.clearDialog}/>
        <form>
          <label>
            <input type='radio' value='true' checked={staticsite === 'true'} onChange={this.handleInputUpdate}/> Enabled
          </label>
          <label>
            <input type='radio' value='false' checked={staticsite !== 'true'} onChange={this.handleInputUpdate}/> Disabled
          </label>
        </form>
        <button onClick={this.handleUpdate} disabled={propertyUpdating}>Update</button>
      </div>
    )
  }
}

StaticSite.propTypes = {
  staticsite: PropTypes.string.isRequired,
  getProperty: PropTypes.func.isRequired,
  latestPropUpdate: PropTypes.string.isRequired,
  propertyUpdating: PropTypes.bool.isRequired,
  setProperty: PropTypes.func.isRequired
}

export default connect(mapStateToProps, mapDispatchToProps)(StaticSite)
