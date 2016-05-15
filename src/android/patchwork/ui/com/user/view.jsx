'use babel'
import React from 'react'
import mlib from 'ssb-msgs'
import schemas from 'ssb-msg-schemas'
import DropdownBtn from 'patchkit-dropdown'
import VerticalFilledContainer from 'patchkit-vertical-filled'
import MsgList from 'patchkit-msg-list'
import Notification from 'patchkit-msg-view/notification'
import Thread from 'patchkit-flat-msg-thread'
import Composer from 'patchkit-post-composer'
import { AutoRefreshingComponent } from '../index'
import * as UserInfo from './info'
import LeftNav from '../leftnav'
import RightNav from '../rightnav'
import u from 'patchkit-util'
import social from 'patchkit-util/social'
import app from '../../lib/app'

const VIEW_ACTIVITY = { label: <h2>Activity</h2> }
const VIEW_ABOUT = { label: <h2>About</h2> }
const VIEW_CONTACTS = { label: <h2>Contacts</h2> }
const TABS = [VIEW_ACTIVITY, VIEW_ABOUT, VIEW_CONTACTS]

const FLAG_DROPDOWN = [
  { value: 'dead',  label: "Dead Account / Lost Keys" },
  { value: 'spam',  label: "Spammer" },
  { value: 'abuse', label: "Abusive Behavior" }
]

export default class UserView extends AutoRefreshingComponent {
  computeState(props) {
    const pid = props ? props.pid : this.props.pid
    return {
      currentTabIndex: (this.state) ? this.state.currentTabIndex : 0,
      isComposerOpen: (this.state) ? this.state.isComposerOpen : false,
      hasFlagged: social.flags(app.users, app.user.id, pid)
    }
  }

  getTabs() {
    return TABS
  }

  onSelectTab(tab) {
    const tabs = this.getTabs()
    this.setState({ currentTabIndex: tabs.indexOf(tab) })
  }

  onClickCompose() {
    this.setState({ isComposerOpen: true }, () => {
      // focus the textarea
      this.refs.profile.querySelector('textarea').focus()
    })
  }

  onCancelCompose() {
    this.setState({ isComposerOpen: false })
  }

  onSend(msg) {
    // go to the message
    app.history.pushState(null, '/msg/'+encodeURIComponent(msg.key))
  }

  onFlag(reason) {
    // publish vote message
    const voteMsg = schemas.vote(this.props.pid, -1, reason)
    app.ssb.publish(voteMsg, err => {
      if (err)
        return app.issue('Failed to publish flag', err, 'Happened when the user used the flag modal in the profile')
      app.notice('Your flag has been published')
      app.fetchLatestState()
    })
  }

  onUnflag() {
    // publish vote message
    const voteMsg = schemas.vote(this.props.pid, 0)
    app.ssb.publish(voteMsg, err => {
      if (err)
        return app.issue('Failed to publish update', err, 'Happened when the user used the unflag button in the profile')
      app.notice('Your flag has been removed')
      app.fetchLatestState()
    })
  }

  render() {
    const isSelf = this.props.pid == app.user.id
    const name = u.getName(app.users, this.props.pid)
    const tabs = this.getTabs()
    const currentTab = tabs[this.state.currentTabIndex] || tabs[0]

    const Hero = (props) => {
      return <div>
        <UserInfo.Header key={this.props.pid} pid={this.props.pid} tabs={tabs} currentTab={currentTab} onSelectTab={this.onSelectTab.bind(this)} onClickCompose={this.onClickCompose.bind(this)} />
        { this.state.isComposerOpen
          ? <div className="user-profile-composer">
              <Composer
                isPublic={false}
                recps={[this.props.pid]}
                suggestOptions={app.suggestOptions}
                channels={app.channels} 
                placeholder={'Write a private message to '+name}
                cancelBtn onCancel={this.onCancelCompose.bind(this)}
                onSend={this.onSend.bind(this)} />
            </div>
          : '' }
      </div>
    }

    const ThisRightNav = props => {
      return <RightNav>
        { isSelf ? '' : <div>
          <hr className="labeled" data-label="this user" />
          { (this.state.hasFlagged)
            ? <a className="btn" onClick={this.onUnflag.bind(this)}><i className="fa fa-flag" /> Unflag this user</a> :
              <DropdownBtn className="btn hint--top-left" hint="Warn your followers about this user." items={FLAG_DROPDOWN} right onSelect={this.onFlag.bind(this)}>
                <i className="fa fa-flag" /> Flag this user
              </DropdownBtn>  }
        </div> }
      </RightNav>
    }

    if (currentTab === VIEW_ABOUT) {
      return <VerticalFilledContainer className="user-profile flex" key={this.props.pid}>
        <LeftNav location={this.props.location} />
        <div ref="profile" className="flex-fill">
          <Hero />
          <div className="user-profile-about">
            <UserInfo.Type pid={this.props.pid} />
            <UserInfo.Flags pid={this.props.pid} />
            <UserInfo.Names pid={this.props.pid} />
            <UserInfo.Pics pid={this.props.pid} />
            <UserInfo.Data pid={this.props.pid} />
          </div>
        </div>
        <ThisRightNav />
      </VerticalFilledContainer>
    }
    if (currentTab === VIEW_CONTACTS) {
      return <VerticalFilledContainer className="user-profile flex" key={this.props.pid}>
        <LeftNav location={this.props.location} />
        <div ref="profile" className="flex-fill">
          <Hero />
          <div className="user-profile-contacts">
            <UserInfo.Contacts pid={this.props.pid} />
          </div>
        </div>
        <ThisRightNav />
      </VerticalFilledContainer>
    }

    // normal msg-list render
    const feed = opts => {
      opts = opts || {}
      opts.id = this.props.pid
      return app.ssb.createUserStream(opts)
    }
    const cursor = (msg) => {
      if (msg)
        return msg.value.sequence
    }
  
    // MsgList must have refreshOnReply
    // - Why: in other views, such as the inbox view, a reply will trigger a new message to be emitted in the livestream
    // - that's not the case for `createUserStream`, so we need to manually refresh a thread on reply
    return <div ref="profile" className="user-profile" key={this.props.pid}>
      <MsgList
        ref="list"
        key={currentTab.label}
        dateDividers
        LeftNav={LeftNav} leftNavProps={{location: this.props.location}}
        RightNav={ThisRightNav}
        ListItem={Notification} listItemProps={{ listView: true }}
        Thread={Thread} threadProps={{ suggestOptions: app.suggestOptions, channels: app.channels }}
        TopNav={Hero}
        source={feed}
        cursor={cursor} />
    </div>
  }
}