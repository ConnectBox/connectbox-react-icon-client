/** @fileoverview Single tile component for the RootFolderList icon grid.
 * Selects between an image icon (when icon_file metadata is present) and a
 * FontAwesome category icon, and optionally shows the folder name below the
 * icon based on the displayFolderName configuration flag. */

import './RootFolderListEntry.css'

import React, { Component } from 'react'
import PropTypes from 'prop-types'
import {  topLevelCategory } from '../utils'
import { Link } from 'react-router-dom'

/**
 * A single icon tile in the root-level folder grid.
 * Top-level directories always navigate via hash link so the router handles
 * the transition client-side. Two render paths exist: one for directories that
 * have a custom icon image, and one that falls back to a FontAwesome category
 * icon derived from the file metadata.
 */
class RootFolderListEntry extends Component {
    static propTypes = {
        file: PropTypes.object.isRequired,
        contentRoot: PropTypes.string.isRequired,
        displayFolderName: PropTypes.bool.isRequired,
        iconMetadata: PropTypes.object.isRequired
    }

  /**
   * Renders one root-level directory tile.
   * The row_name CSS class hides the folder name text when displayFolderName
   * is false, keeping the grid icon-only. folderNameSpan is conditionally
   * constructed before the two return paths to avoid duplicating the logic.
   * @returns {JSX.Element}
   */
  render () {
    const { file, contentRoot, displayFolderName, iconMetadata } = this.props
    const { icon_file, name } = file
    const fileLink = `#/${name}`

    let spanClass = 'directory'
    // Append row_name to suppress the visible label when folder names are hidden
    if (!displayFolderName) {
      spanClass = spanClass + ' row_name'
    }

    let folderNameSpan = undefined
    // Image-icon path: show the name beneath the image if configured
    if (icon_file) {
      if (displayFolderName) {
        folderNameSpan = (
          <span>{name}</span>
        )
      }

      return (
        <tr>
          <td className="centered">
            <Link to={fileLink}>
              <div className="home-icon-container">
                  <img alt="" src={`${contentRoot}/${icon_file}`} />
              </div>
              {folderNameSpan}
              <span className={spanClass}></span>
            </Link>
          </td>
        </tr>
      )
    }

    // FontAwesome-icon path: add a line break before the name so it sits below the icon
    if (displayFolderName) {
      folderNameSpan = (
        <span><br />{name}</span>
      )
    }

    return (
      <tr>
        <td className="centered">
          <Link to={fileLink}>
            <i className={ `fa ${topLevelCategory(file, iconMetadata)}` }></i>
            {folderNameSpan}
            <span className={spanClass}></span>
          </Link>
        </td>
      </tr>
    )
  }
}

export default RootFolderListEntry
