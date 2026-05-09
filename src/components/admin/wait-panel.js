/** @fileoverview Full-screen loading overlay shown while a property update is
 * in flight. Renders a CSS spinner over a dimmed backdrop to block interaction
 * and communicate that the device is processing a change. */

import { connect } from 'react-redux'
import PropTypes from 'prop-types'
import React, { Component } from 'react'

/**
 * Selects the propertyUpdating flag from Redux state.
 * @param {Object} state - Full Redux state tree.
 * @returns {{propertyUpdating: boolean}}
 */
function mapStateToProps (state) {
  const { propertyUpdating } = state
  return { propertyUpdating }
}

const mapDispatchToProps = {}

/**
 * Displays a full-screen spinner overlay while a property is being updated.
 * Returns null (via short-circuit &&) when no update is in progress so the
 * component adds zero DOM nodes in the idle state.
 */
class WaitPanel extends Component {
  /**
   * @returns {JSX.Element|false} The overlay element when updating, false otherwise.
   */
  render () {
    const { propertyUpdating } = this.props
    return propertyUpdating && <div className='dialog-overlay'><span className='waiting-modal loader' /></div>
  }
}

WaitPanel.propTypes = {
  propertyUpdating: PropTypes.bool.isRequired
}

export default connect(mapStateToProps, mapDispatchToProps)(WaitPanel)
