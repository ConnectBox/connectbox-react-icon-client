/** @fileoverview Root-level folder icon grid component. Displays top-level
 * content directories as large icon tiles rather than a list, making it the
 * primary navigation interface when no sub-folder is selected. */

import './FolderList.css'
import './RootFolderList.css'

import React, { Component } from 'react'
import PropTypes from 'prop-types'
import RootFolderListEntry from './RootFolderListEntry'

/**
 * Renders the home-screen icon grid of top-level content directories.
 * Each directory is represented by a RootFolderListEntry tile. The 'collapsed'
 * CSS class on the table removes default Bootstrap cell padding so icons fill
 * the available width.
 */
class RootFolderList extends Component {
    static propTypes = {
        content: PropTypes.array.isRequired,
        contentRoot: PropTypes.string.isRequired,
        displayFolderName: PropTypes.bool.isRequired,
        iconMetadata: PropTypes.object.isRequired
    }

  render () {
    const { content, contentRoot, displayFolderName, iconMetadata } = this.props
    let menuItems = []
    for (let i = 0; i < content.length; i++) {
      menuItems.push(
        <RootFolderListEntry
            contentRoot={contentRoot}
            key={`root${i}`}
            file={content[i]}
            displayFolderName={displayFolderName}
            iconMetadata={iconMetadata}
        />)
    }

    return (
      <div className="table-responsive">
          <table className="table collapsed">
              <tbody>
                  {menuItems}
              </tbody>
          </table>
      </div>
    )
  }
}

export default RootFolderList
