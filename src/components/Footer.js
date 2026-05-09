/** @fileoverview Footer bar component. Renders a sticky footer with a settings
 * gear icon that links to the admin dashboard at /admin/. */

import './Footer.css'

import React, { Component } from 'react'
import { Link } from 'react-router-dom'

/**
 * Application footer bar containing the admin settings link.
 * Uses a React Router Link (not an anchor) so navigation stays within the SPA
 * without a full page reload.
 */
class Footer extends Component {
  onSettingsClick = (evt) => {
    window.location.href = '/admin/'
  }

  render () {
    return (
      <div
        className='footer breadcrumb'>
        <div className='spacer' />
        <Link className='settings-button' to='/admin/'>
          <i className={`fa fa-cog fa-lg`} aria-hidden='true'></i>
        </Link>
      </div>
    )
  }
}

export default Footer
