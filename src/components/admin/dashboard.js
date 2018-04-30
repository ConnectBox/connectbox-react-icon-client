import './admin-component.css'

import React, { Component } from 'react'
import PropTypes from 'prop-types'
import Banner from './banner'
import Channel from './channel'
import Hostname from './hostname'
import Password from './password'
import Ssid from './ssid'
import StaticSite from './static-site'
import System from './system'
import { connect } from 'react-redux'
import { Link, withRouter } from 'react-router-dom'

import {
  checkAuthenticated
} from '../../redux'

// TODO
//  - This will need to fire off a redux event with the password info
//  - can have a separate property on the dashboard that actually displays the update message
//  - SSID needs a wait for update where it polls the value until it gets updated
//  - router - for dashboard so url updates when you click around
//  - Footer is in the incorrect place - not at the bottom
//  - How are we handling errors? I think redux is setting a message but not displaying it

const adminRoot = '/admin/'

function mapStateToProps (state) {
  const { authenticated, propertyUpdating } = state
  return { authenticated, propertyUpdating }
}

const mapDispatchToProps = {
  checkAuthenticated
}

// TODO Need a footer

class AdminPanel extends Component {
  componentDidMount () {
    if (!this.props.authenticated) {
      this.props.checkAuthenticated() // api call triggering authentication
    }
  }

  render () {
    const { authenticated, propertyUpdating } = this.props

    const { location } = this.props
    const { pathname } = location
    const selected = pathname === adminRoot ? 'home' : pathname.substring(adminRoot.length)

    if (!authenticated) {
      return (<div>Authenticating...</div>)
    }

    return (
      <div className={`dashboard ${propertyUpdating ? 'updating' : ''}`}>
        <div>
          {selected === 'home' &&
            (<div>
              <h1>ConnectBox - share media with wifi</h1>
              <ul>
                <li><Link to='about'>About</Link></li>
                <li><Link to='reports'>Reports</Link></li>
                <li><Link to='configuration'>Configuration</Link></li>
              </ul>
            </div>
            )
          }
          {selected === 'about' &&
            (<div>
              About page
             </div>
            )
          }
          {selected === 'configuration' &&
            (<div>
              <ul>
                <li><Link to='wap'>Wireless Access Point</Link></li>
                <li><Link to='webserver'>Web Server</Link></li>
                <li><Link to='userinterface'>User Interface</Link></li>
                <li><Link to='password'>Password</Link></li>
                <li><Link to='system'>System</Link></li>
              </ul>
            </div>
            )
          }
          {selected === 'wap' &&
            (<div>
              Configure the Wireless Access Point
              <ul>
                <li><Link to='wap-ssid'>SSID</Link></li>
                <li><Link to='wap-channel'>Channel</Link></li>
              </ul>
            </div>
            )
          }
          {selected === 'wap-ssid' &&
            (<div>
              <Ssid />
            </div>
            )
          }
          {selected === 'wap-channel' &&
            (<div>
              <Channel />
            </div>
            )
          }
          {selected === 'webserver' &&
            (<div>
              <ul>
                <li><Link to='webserver-staticsite'>Static site configuration</Link></li>
                <li><Link to='webserver-hostname'>Hostname</Link></li>
              </ul>
            </div>
            )
          }
          {selected === 'userinterface' &&
            (<div>
              <ul>
                <li><Link to='userinterface-banner'>Banner Message</Link></li>
              </ul>
            </div>
            )
          }
          {selected === 'webserver-staticsite' &&
            (<div>
              Configure the Static site

              <StaticSite />
            </div>
            )
          }
          {selected === 'webserver-hostname' &&
            (<div>
              Configure the hostname
              <Hostname path='admin/webserver-hostname' />
            </div>
            )
          }
          {selected === 'userinterface-banner' &&
            (<div>
              Configure the banner
              <Banner />
            </div>
            )
          }
          {selected === 'password' &&
            (<div>
              <Password />
            </div>
            )
          }
          {selected === 'system' &&
            (<div>
              <System />
            </div>
            )
          }
          {selected !== 'home' &&
            <button
              onClick={() => this.props.history.goBack()}>Back</button>}
        </div>
      </div>
    )
  }
}

AdminPanel.propTypes = {
  authenticated: PropTypes.bool.isRequired,
  checkAuthenticated: PropTypes.func.isRequired,
  propertyUpdating: PropTypes.bool.isRequired
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(AdminPanel))
