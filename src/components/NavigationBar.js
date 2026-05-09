/** @fileoverview Breadcrumb navigation bar component. Parses the current
 * content path into clickable crumb segments and shows a reload button with
 * a CSS spinner while content is loading. */

import './NavigationBar.css'

import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'

/**
 * Renders a breadcrumb trail from the root home icon to the current directory.
 * Each segment becomes a clickable hash-link except the last (current) segment,
 * which is rendered as plain text. An animated refresh icon acts as the reload
 * button and shows a CSS rotation animation while content is loading.
 */
class NavigationBar extends Component {
    static propTypes = {
        contentPath: PropTypes.string.isRequired,
        loading: PropTypes.bool.isRequired,
        reload: PropTypes.func.isRequired
    }

    constructor (props) {
        super(props)

        this.pathParts = this.pathParts.bind(this)
    }

    /**
     * Splits the current contentPath into an array of breadcrumb objects,
     * each with a cumulative path and a display name. An empty segment at the
     * start (from splitting a leading slash) is labelled '<root>' and rendered
     * as the home icon rather than as text.
     * @returns {Array<{path: string, name: string}>}
     */
    pathParts () {
      const { contentPath } = this.props
      // Strip a bare slash so split('/') doesn't produce a leading empty segment
      let parts = (contentPath === '/' ? '': contentPath).split('/')
      let up = ''
      // Build cumulative paths so each crumb link points to the correct depth
      for (var i = 0, l = parts.length; i < l; i++) {
        const path = up + parts[i]
        up = path + '/'
        parts[i] = { path: path, name: parts[i] || '<root>' }
      }
      return parts
    }

  /**
   * Builds and renders the ordered breadcrumb list.
   * The last path segment gets flex-basis: 100% so it fills remaining bar
   * width and truncates with an ellipsis when the path is deep. The root
   * element is always rendered as a home icon link regardless of depth.
   * @returns {JSX.Element}
   */
  render () {
    let pathElements = []
    const pathParts = this.pathParts()
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i]
      const className = part.name !== '<root>' ? 'navbar-element' : null;
      const style = {};
      // Give the final (current) segment all remaining bar width for long paths
      if (part.name !== '<root>') {
        if (i === pathParts.length - 1) {
          style['flex-basis'] = '100%';
        }
      }
      pathElements.push(
        <li key={`crumb${i}`} className={className} style={style}>
          {part.name === '<root>' && 
          <span>
           <Link to=''><i className="fa fa-home fa-lg"></i></Link>
          </span>}

          {i === pathParts.length - 1 && part.name !== '<root>' &&
          <span>{part.name}</span>}

          {i < pathParts.length - 1 && part.name !== '<root>' &&
          <Link to={`/#${part.path}`}>{part.name}</Link>}
        </li>
      )
    }

    return (
      <ol className='navbar-container breadcrumb' style={{left: '0px', right: '0px', position: 'absolute', zIndex: 1000}}>
        <li>
          <a role='button' onClick={this.props.reload} title='Reload'>
            <i className={`fa fa-refresh${this.props.loading ? ' loader' : ''}`} />
          </a>
        </li>
        {pathElements}
      </ol>
    )
  }
}

export default NavigationBar
