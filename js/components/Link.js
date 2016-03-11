require('../../vendor/semantic/dist/components/button.css')
require('../../vendor/semantic/dist/components/modal.css')
require('../../vendor/semantic/dist/components/modal')
require('../../vendor/semantic/dist/components/dimmer.css')
require('../../vendor/semantic/dist/components/dimmer')
require('../../vendor/semantic/dist/components/form.css')
require('../../vendor/semantic/dist/components/form')
require('../../vendor/semantic/dist/components/input.css')
require('../../vendor/semantic/dist/components/transition.css')
require('../../vendor/semantic/dist/components/transition')

import React from 'react'
import ReactDOM from 'react-dom'

export default class Link extends React.Component {
    componentDidMount() {
        $(ReactDOM.findDOMNode(this)).modal({
            detachable: false,
            context: '.dimmable',
            onHidden: () => {
                if (this._cb) {
                    this._cb(null)
                    delete this._cb
                }
            },
            onApprove: () => {
                this._cb(this.refs.link.value)
                delete this._cb
            }
        });
    }

    componentDidUpdate() {
        $(ReactDOM.findDOMNode(this)).modal('refresh');
    }

    show(cb) {
        this._cb = cb;
        $(ReactDOM.findDOMNode(this)).modal('show');
    }

    render() {
        return (
            <div className="ui small modal">
                <div className="header">
                    Insert Link
                </div>
                <div className="content">
                    <div className="ui form ">
                        <div className="field">
                            <label>URL</label>
                            <input ref="link" type="text"></input>
                        </div>
                    </div>
                </div>
                <div className="actions">
                    <div className="ui positive button">OK</div>
                    <div className="ui cancel button">Cancel</div>
                </div>
            </div>
        )
    }
}
