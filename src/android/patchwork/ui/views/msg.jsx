'use babel'
import React from 'react'
import Thread from 'patchkit-flat-msg-thread'
import VerticalFilledContainer from 'patchkit-vertical-filled'
import LeftNav from '../com/leftnav'
import RightNav from '../com/rightnav'
import mlib from 'ssb-msgs'
import app from '../lib/app'

export default class Msg extends React.Component {
  render() {
    const id = this.props.params && this.props.params.id
    return <div id="msg">
      <VerticalFilledContainer id="msg-thread-vertical" className="flex">
        <LeftNav location={this.props.location} />
        <div className="flex-fill" style={{padding: 5}}>
          <Thread id={id} suggestOptions={app.suggestOptions} channels={app.channels} forceRootExpanded live />
        </div>
        <RightNav />
      </VerticalFilledContainer>
    </div>
  }
}