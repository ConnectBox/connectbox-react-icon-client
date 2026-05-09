/** @fileoverview Single row component for the FolderList table. Chooses
 * between an icon-image layout (when icon_file is present) and a FontAwesome
 * icon layout, and uses a hash-based href for directories vs a content-server
 * href for files. */

import './FolderListEntry.css'

import React, { Component } from 'react'
import PropTypes from 'prop-types'
import {  subLevelCategory, mediaTypes } from '../utils'

/**
 * A single row in the FolderList table representing one file or directory.
 * Directories link via hash fragment (#path) to trigger client-side navigation;
 * files link directly to the content server path so the browser can download
 * or stream them. An icon image takes precedence over the FontAwesome fallback
 * when icon_file metadata is present.
 */
class FolderListEntry extends Component {
    static propTypes = {
        file: PropTypes.object.isRequired,
        folderPath: PropTypes.string.isRequired,
        contentRoot: PropTypes.string.isRequired,
        iconMetadata: PropTypes.object.isRequired
    }

  /**
   * Renders a table row for one file or directory entry.
   * Directory links use a bare '#' prefix so the router intercepts them as
   * hash navigation rather than a server request. File links go through
   * contentRoot so the content server handles delivery.
   * @returns {JSX.Element}
   */
  render () {
    const { file, contentRoot, folderPath, iconMetadata } = this.props
    const { icon_file, name } = file
    // Directories navigate client-side via hash; files go to the content server
    const fileLink = `${file.type === 'directory' ? '#' : contentRoot}${folderPath}/${name}`

    let spanClass = file.type === 'directory' ? 'directory' : ''

    // When an icon image is available, prefer it over the FontAwesome icon
    if (icon_file) {
      return (
          <tr>
            <td>
              <a href={fileLink}>
                <div className="subfolder-icon-container">
                    <img alt="" src={`${contentRoot}${folderPath}/${icon_file}`} />
                </div>
                <span className={spanClass}>
                    <span>&nbsp;{name}</span>
                </span>
              </a>
            </td>
          </tr>
      )
    }
    const iconClass = file.type === 'directory' ? subLevelCategory(file, iconMetadata) : mediaTypes(file)
    return (
      <tr>
        <td>
          <a href={fileLink}>
            <i className={ `fa ${iconClass}` }></i>
            <span className={spanClass}>
                <span>&nbsp;{name}</span>
            </span>
          </a>
        </td>
      </tr>
    )
  }
}

export default FolderListEntry
