/** @fileoverview Single entry row for the PopularFileList table. Renders the
 * file name with a media-type icon and a row of lightning-bolt icons whose
 * count reflects the file's popularity score. */

import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { mediaTypes } from '../utils'

/**
 * A single row in the PopularFileList table.
 * Renders one lightning-bolt icon per score point as a visual popularity
 * indicator, and links the file name directly to its content-server resource URL.
 */
class PopularFileListEntry extends Component {
    static propTypes = {
        file: PropTypes.object.isRequired,
        hideTopBorder: PropTypes.bool.isRequired,
    }

  /**
   * Renders the table row for one popular file.
   * Builds an array of bolt icons equal to the file's score, then renders them
   * inline after the file link. hideTopBorder removes the Bootstrap table
   * row separator on the first entry so it flows visually from the header.
   * @returns {JSX.Element}
   */
  render () {
    const { hideTopBorder, file } = this.props
    const popIndicatorElements = []
    // One lightning-bolt icon per popularity score point
    for (let j = 0; j < file.score; j++) {
        popIndicatorElements.push(<span key={`score${j}`}><i className="fa fa-flash" style={{paddingRight: '2px', color: '#337ab7'}}></i></span>)
    }

    return (
        <tr>
            <td style={hideTopBorder ? {borderTop: 0} : {}}>
                <a style={{display: "inline-block"}} href={file.resource}>
                    <i className={`fa ${mediaTypes(file)}`}></i>
                    <span>&nbsp;{file.name}</span>
                </a>
                <span style={{display: "inline-block", paddingLeft: '4px'}}>&nbsp;{popIndicatorElements}</span>
            </td>
        </tr>
    )
  }
}

export default PopularFileListEntry