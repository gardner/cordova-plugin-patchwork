'use babel'
import React from 'react'
import { Link } from 'react-router'
import schemas from 'ssb-msg-schemas'
import multicb from 'multicb'
import ip from 'ip'
import Tabs from 'patchkit-tabs'
import ModalBtn from 'patchkit-modal/btn'
import FormProfileName from 'patchkit-form-profile-name'
import FormProfileImage from 'patchkit-form-profile-image'
import { AutoRefreshingComponent } from '../index'
import { UserLink, UserPic, UserBtn } from 'patchkit-links'
import HoverShifter from 'patchkit-hover-shifter'
import { UserSummaries } from './summary'
import app from '../../lib/app'
import u from 'patchkit-util'
import social from 'patchkit-util/social'

export class Header extends AutoRefreshingComponent {
  constructor(props) {
    super(props)

    // event handlers
    this.on = {
      toggleFollow: () => {
        if (this.state.isSelf) return
        // publish contact msg
        const willBeFollowing = !this.state.isFollowing
        const msg = willBeFollowing ? schemas.follow(this.props.pid) : schemas.unfollow(this.props.pid)
        app.ssb.publish(msg, (err) => {
          if (err) return app.issue('Failed to publish contact msg', err, 'Profile view onToggleFollow')
          app.fetchLatestState()
          if (willBeFollowing)
            app.notice('You are now following '+this.state.name)
          else
            app.notice('You are no longer following '+this.state.name)
        })
      }
    }
  }

  computeState(props) {
    const pid = props ? props.pid : this.props.pid
    return {
      name:        app.users.names[pid] || u.shortString(pid, 6),
      isSelf:      (pid == app.user.id),
      isPub:       isPub(pid),
      isFollowing: social.follows(app.users, app.user.id, pid),
      followsYou:  social.follows(app.users, pid, app.user.id),
      followers:   social.followers(app.users, pid)
    }
  }

  render() {
    // name conflict controls
    var nameConflictDlg
    var nameConflicts = []
    for (var id in app.users.names) {
      if (id != this.props.pid && app.users.names[id] == app.users.names[this.props.pid])
        nameConflicts.push(id)
    }
    if (nameConflicts.length) {
      // :TODO:
      // nameConflictDlg = h('.well.white', { style: 'margin: -10px 15px 15px' },
      //   h('p', { style: 'margin-bottom: 10px' }, h('strong', 'Other users named "'+app.users.names[pid]+'":')),
      //   h('ul.list-inline', nameConflicts.map(function (id) { return h('li', com.user(id)) })),
      //   h('p', h('small', 'ProTip: You can rename users to avoid getting confused!'))
      // )
    }

    const nfollowers = this.state.followers.length
    return <div className="user-info">
      <div className="info">
        <h1>{this.state.name} { this.state.isPub ? <small><i className="fa fa-laptop"/> pub bot</small> : '' }</h1> 
        { this.state.isSelf
          ? <div>This is you!</div>
          : <div>
              <a href="javascript:" onClick={this.on.toggleFollow} className="btn">
                { this.state.isFollowing && this.state.followsYou
                  ? <HoverShifter>
                      <span><i className="fa fa-check" /> Friend</span>
                      <span><i className="fa fa-times" /> Stop following</span>
                    </HoverShifter>
                  : '' }
                { this.state.isFollowing && !this.state.followsYou
                  ? <HoverShifter>
                      <span><i className="fa fa-check" /> Following</span>
                      <span><i className="fa fa-times" /> Stop following</span>
                    </HoverShifter>
                  : '' }
                { !this.state.isFollowing && this.state.followsYou
                  ? <HoverShifter>
                      <span><i className="fa fa-user-plus" /> Follows you</span>
                      <span><i className="fa fa-plus" /> Add to friends</span>
                    </HoverShifter>
                  : '' }
                { !this.state.isFollowing && !this.state.followsYou
                  ? <span><i className="fa fa-plus" /> Start following</span>
                  : '' }
              </a>
              <a href="javascript:" className="btn compose-btn" onClick={this.props.onClickCompose}><i className="fa fa-pencil" /> Send Message</a>
            </div> }
        <div>{nfollowers} follower{nfollowers===1?'':'s'}</div>
      </div>
      <div className="bar">
        <div className="avatar">
          <img src={u.getProfilePicUrl(app.users, this.props.pid)} />
        </div>
        <Tabs tabs={this.props.tabs} selected={this.props.currentTab} onSelect={this.props.onSelectTab} />
      </div>
    </div>
  }
}

function sortFollowedFirst (a, b) {
  // rank followed followers first
  const aFollowed = (app.user.id === a || social.follows(app.users, app.user.id, a)) ? 1 : 0
  const bFollowed = (app.user.id === b || social.follows(app.users, app.user.id, b)) ? 1 : 0
  return bFollowed - aFollowed  
}

export class Contacts extends AutoRefreshingComponent {
  computeState(props) {
    const pid = props ? props.pid : this.props.pid
    return { 
      friends: social.friends(app.users, pid).sort(sortFollowedFirst),
      followers: social.followerNonfriends(app.users, pid).sort(sortFollowedFirst),
      followeds: social.followedNonfriends(app.users, pid).sort(sortFollowedFirst),
    }
  }
  render() {
    return <div>
      <hr className="labeled" data-label="Friends" />
      <UserSummaries ids={this.state.friends} />
      <hr className="labeled" data-label="Followers" />
      <UserSummaries ids={this.state.followers} />
      <hr className="labeled" data-label="Following" />
      <UserSummaries ids={this.state.followeds} />
    </div>
  }
}


export class Flags extends AutoRefreshingComponent {
  computeState(props) {
    const pid = props ? props.pid : this.props.pid
    return {
      profile: app.users.profiles[pid],
      flaggers: social.followedFlaggers(app.users, app.user.id, pid, true)
    }
  }
  render() {
    const pid = this.props.pid
    const flaggers = this.state.flaggers
    if (flaggers.length === 0)
      return <span />
    return <div>
      <hr className="labeled" data-label="warnings" />
      { flaggers.map(flagger => {
        const flag = this.state.profile.flaggers[flagger]

        let reasonLabel
        if      (flag.reason === 'spam')  reasonLabel = 'Warning! This account is a spammer.'
        else if (flag.reason === 'abuse') reasonLabel = 'Warning! This account is abusive.'
        else if (flag.reason === 'dead')  reasonLabel = 'Warning! This account has been discontinued.'
        else if (flag.reason)             reasonLabel = flag.reason
        else                              reasonLabel = 'Flagged for personal reasons.'

        const onClick = () => app.history.pushState(null, '/msg/'+encodeURIComponent(flag.msgKey))   
        return <div className="msg-view oneline" onClick={onClick}>
          <div className="authors">
            <UserPic id={flagger} />
            <UserLink id={flagger} />
          </div>
          <div className="content"><i className="fa fa-flag" /> {reasonLabel}</div>
        </div>
      }) }
    </div>
  }
}

export class Type extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      isPub: isPub(this.props.pid)
    }
  }
  render() {
    if (this.state.isPub) {
      return <div>
        <h2>This user is a public bot. It shares user data with peers across the globe.</h2>
      </div>
    }
    return <span/>
  }
}

export class Names extends AutoRefreshingComponent {
  computeState(props) {
    const pid = props ? props.pid : this.props.pid
    return {
      profile: app.users.profiles[pid],
      expandedName: this.state ? this.state.expandedName : false,
      currentName: u.getName(app.users, pid)
    }
  }
  onSelectName(name) {
    app.ssb.publish(schemas.name(this.props.pid, name), err => {
      if (err)
        return app.issue('Failed to Update Name', err, 'This error occurred while using a name chosen by someone else')
      app.fetchLatestState()
      app.notice('Name updated')
    })    
  }
  static ExpandedInfo(props) {
    const isMe = props.profile.id === app.user.id 
    const names = props.profile.names[props.expandedName]

    // is what the user chose for themselves
    const isSelfAssigned = (props.profile.self.name === props.expandedName)

    // is a name that I've explicitly chosen for them
    const isMyChosenName = (props.expandedName == (isMe ? props.profile.self.name : props.profile.byMe.name))

    // is the name currently in use
    const isCurrentName = (props.currentName === props.expandedName)
    
    // users (followed and unfollowed) that have chosen this name
    const followedUsers = names.filter(id => id !== props.profile.id && id !== app.user.id && social.follows(app.users, app.user.id, id))
    const unfollowedUsers = names.filter(id => id !== props.profile.id && id !== app.user.id && !social.follows(app.users, app.user.id, id))
    const followedUsersNames = followedUsers.map(id => u.getName(app.users, id)).join(', ')
    const unfollowedUsersNames = unfollowedUsers.map(id => u.getName(app.users, id)).join(', ')

    return <div className="expanded-card-info">
      <h1>{props.expandedName}</h1>
      { isSelfAssigned ? <div><strong>Default name (self-assigned)</strong></div> : '' }
      { (isMyChosenName || followedUsers.length || unfollowedUsers.length)
        ? <div>Chosen by:
            <ul>
              { followedUsers.length ? <li><span className="hint--bottom" data-hint={followedUsersNames}>{followedUsers.length} users you follow</span></li> : '' }
              { unfollowedUsers.length ? <li><span className="hint--bottom" data-hint={unfollowedUsersNames}>{unfollowedUsers.length} users you {"don't"} follow</span></li> : '' }
              { isMyChosenName ? <li><strong>You</strong></li> : '' }
            </ul>
          </div>
        : '' }
      { !isCurrentName ? <div><a href="javascript:" className="btn" onClick={()=>props.onSelectName(props.expandedName)}>Use This Name</a></div> : '' }
    </div>
  }
  onSubmit(name, cb) {
    // publish update message
    if (!name || name == this.state.currentName)
      return cb()
    app.ssb.publish(schemas.name(this.state.profile.id, name), err => {
      // update app state
      app.fetchLatestState(cb)
    })
  }
  render() {
    if (!this.state.profile)
      return <span/>
    const isMe = this.state.profile.id === app.user.id 
    const expanded = this.state.expandedName
    const current = this.state.currentName
    const onSelect = name => () => this.setState({ expandedName: (name == this.state.expandedName) ? false : name })
    const renderName = name => {
      return <div key={name} className={`card name ${name==current?'current':''} ${name==expanded?'expanded':''}`} onClick={onSelect(name)}>
        <h2>{name}</h2>
        { this.state.expandedName == name ? <Names.ExpandedInfo {...this.state} onSelectName={this.onSelectName.bind(this)} /> : '' }
      </div>
    }
    return <div>
      <hr className="labeled" data-label="also known as" />
      <div className="user-info-cards">
        { Object.keys(this.state.profile.names).map(renderName) }
        <div className="add-new name">
          <ModalBtn
            className="fullheight"
            Form={FormProfileName}
            formProps={{
              isOtherUser: !isMe,
              className: 'text-center vertical-center',
              currentValue: current,
              onSubmit: this.onSubmit.bind(this)
            }}
            nextLabel="Publish">
            <a><h2><i className="fa fa-plus"/> new name</h2></a>
          </ModalBtn>
        </div>
      </div>
    </div>
  }
}

export class Pics extends AutoRefreshingComponent {
  computeState(props) {
    const pid = props ? props.pid : this.props.pid
    return {
      profile: app.users.profiles[pid],
      expandedImageRef: this.state ? this.state.expandedImageRef : false,
      currentImageRef: u.getProfilePicRef(app.users, pid)
    }
  }
  onSelectImage(image) {
    app.ssb.publish(schemas.image(this.props.pid, image), err => {
      if (err)
        return app.issue('Failed to Update Image', err, 'This error occurred while using an image chosen by someone else')
      app.fetchLatestState()
      app.notice('Profile picture updated')
    })    
  }
  static ExpandedInfo(props) {
    const isMe = props.profile.id === app.user.id 
    const images = props.profile.images[props.expandedImageRef]

    // is what the user chose for themselves
    const isSelfAssigned = (getLinkRef(props.profile.self.image) === props.expandedImageRef)

    // is an image that I've explicitly chosen for them
    const isMyChosenImage = (props.expandedImageRef == (isMe ? getLinkRef(props.profile.self.image) : getLinkRef(props.profile.byMe.image)))

    // is the image currently in use
    const isCurrentImage = (props.currentImageRef === props.expandedImageRef)
    
    // users (followed and unfollowed) that have chosen this image
    const followedUsers = images.filter(id => id !== props.profile.id && id !== app.user.id && social.follows(app.users, app.user.id, id))
    const unfollowedUsers = images.filter(id => id !== props.profile.id && id !== app.user.id && !social.follows(app.users, app.user.id, id))
    const followedUsersNames = followedUsers.map(id => u.getName(app.users, id)).join(', ')
    const unfollowedUsersNames = unfollowedUsers.map(id => u.getName(app.users, id)).join(', ')

    return <div className="expanded-card-info">
      { isSelfAssigned ? <div><strong>Default image (self-assigned)</strong></div> : '' }
      { (isMyChosenImage || followedUsers.length || unfollowedUsers.length)
        ? <div>Chosen by:
            <ul>
              { followedUsers.length ? <li><span className="hint--bottom" data-hint={followedUsersNames}>{followedUsers.length} users you follow</span></li> : '' }
              { unfollowedUsers.length ? <li><span className="hint--bottom" data-hint={unfollowedUsersNames}>{unfollowedUsers.length} users you {"don't"} follow</span></li> : '' }
              { isMyChosenImage ? <li><strong>You</strong></li> : '' }
            </ul>
          </div>
        : '' }
      { !isCurrentImage ? <div><a href="javascript:" className="btn" onClick={()=>props.onSelectImage(props.expandedImageRef)}>Use This Image</a></div> : '' }
    </div>
  }
  onSubmit(buffer, cb) {
    app.ssb.patchwork.addFileToBlobs(buffer.toString('base64'), (err, hash) => {
      if (err)
        return cb(err)

      // publish update message
      const imageLink = {
        link: hash,
        size: buffer.length,
        type: 'image/png',
        width: 512,
        height: 512
      }
      app.ssb.publish(schemas.image(this.state.profile.id, imageLink), err => {
        if (err) return cb(err)

        // update app state
        app.fetchLatestState(cb)
      })
    })
  }
  render() {
    if (!this.state.profile)
      return <span/>
    const isMe = this.state.profile.id === app.user.id 
    const expanded = this.state.expandedImageRef
    const current = this.state.currentImageRef
    const onSelect = image => () => this.setState({ expandedImageRef: (image == this.state.expandedImageRef) ? false : image })
    const renderImage = image => {
      return <div key={image} className={`card pic ${image==current?'current':''} ${image==expanded?'expanded':''}`} onClick={onSelect(image)}>
        <img src={'/'+image} />
        { this.state.expandedImageRef == image ? <Pics.ExpandedInfo {...this.state} onSelectImage={this.onSelectImage.bind(this)} /> : '' }
      </div>
    }
    return <div>
      <hr className="labeled" data-label="profile pictures" />
      <div className="user-info-cards">
        { Object.keys(this.state.profile.images).map(renderImage) }
        <div className="add-new pic">
          <ModalBtn
            className="fullheight"
            Form={FormProfileImage}
            formProps={{
              className: 'text-center',
              currentValue: current ? ('/'+current) : undefined,
              onSubmit: this.onSubmit.bind(this)
            }}
            nextLabel="Publish">
            <a><h2><i className="fa fa-plus"/> new pic</h2></a>
          </ModalBtn>
        </div>
      </div>
    </div>
  }
}

// helper to get the ref of a link, if it exists
function getLinkRef(link) {
  return (link) ? link.link : false
}

export class Data extends AutoRefreshingComponent {
  computeState(props) {
    const pid = props ? props.pid : this.props.pid
    return { pid }
  }
  render() {
    return <div>
      <hr className="labeled" data-label="data" />
      <div className="user-info-cards">
        <div className="card data"><span>Public Key</span> <code>{this.props.pid}</code></div>
      </div>
    </div>
  }
}

// is `id` a pub?
function isPub (id) {
  // try to find the ID in the peerlist, and see if it's a public peer if so
  for (var i=0; i < app.peers.length; i++) {
    var peer = app.peers[i]
    if (peer.key === id && !ip.isPrivate(peer.host))
      return true
  }
  return false
}