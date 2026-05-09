/** @fileoverview Reusable modal confirmation dialog for the admin panel.
 * Wraps react-modal with a consistent layout: a header title, body text, and
 * a single OK button. Used by all admin components to report success or error
 * after a property update. */

import './confirm-dialog.css'
import ReactModal from 'react-modal'
import PropTypes from 'prop-types'
import React, { Component } from 'react'

/**
 * Modal dialog used across admin components to acknowledge an operation result.
 * Renders only when isOpen is true; the overlay and content are styled via
 * className/overlayClassName so react-modal does not override admin CSS.
 */
class ConfirmDialog extends Component {
  render () {
    const {isOpen, title, body, handleOk} = this.props
    return (
      <ReactModal
        isOpen={isOpen}
        contentLabel={title}
        className='dialog'
        overlayClassName='dialog-overlay'>
        <span className='dialog-header'>{title}</span>
        <div className='dialog-body'>{body}</div>
        <button className='dialog-button' onClick={handleOk}>OK</button>
      </ReactModal>
    )
  }
}

ConfirmDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  body: PropTypes.string.isRequired,
  handleOk: PropTypes.func.isRequired
}

export default ConfirmDialog
