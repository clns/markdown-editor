require('../../vendor/semantic/dist/components/button.css')
require('../../vendor/semantic/dist/components/divider.css')
require('../../vendor/semantic/dist/components/icon.css')
require('../../vendor/semantic/dist/components/segment.css')

import React from 'react'

var defaultProps = {
    doBold: () => {console.log('bold')}
};

export class Toolbar extends React.Component {
    render() {
        var btnProps = {onClick: onClick.bind(this)};
        return (
            <div className="ui basic center aligned segment"
            style={{position:'absolute',top:0,left:0,right:0,zIndex:4}}>
                <div className="ui small compact icon buttons">
                    <Button icon="bold" {...btnProps}/>
                    <Button icon="italic" {...btnProps}/>
                </div>
                <div className="ui small compact icon buttons">
                    <button className="ui button">
                        <i className="quote right icon"/>
                    </button>
                    <button className="ui button">
                        <i className="code icon"/>
                    </button>
                    <button className="ui button">
                        <i className="linkify icon"/>
                    </button>
                    <button className="ui button">
                        <i className="file image outline icon"/>
                    </button>
                    <button className="ui button">
                        <i className="table icon"/>
                    </button>
                    <button className="ui button">
                        <i className="ordered list icon"/>
                    </button>
                    <button className="ui button">
                        <i className="unordered list icon"/>
                    </button>
                    <button className="ui button">
                        <i className="header icon"/>
                    </button>
                    <button className="ui button">
                        <i className="ellipsis horizontal icon"/>
                    </button>
                </div>
            </div>
        )
    }
}

Toolbar.defaultProps = defaultProps;

function onClick(c, icon) {
    var action = 'do'+ucwords(icon);
    if (this.props[action]) {
        this.props[action]();
    } else {
        alert('no action defined')
    }
}

function ucwords(text) {
    return (text + '')
        .toLowerCase()
        .replace(/[^\w\s]/, '')
        .replace(/^([a-z\u00E0-\u00FC])|\s+([a-z\u00E0-\u00FC])/g, function($1) {
            return $1.toUpperCase()
        })
}

class Button extends React.Component {
    onClick() {
        if (this.props.onClick) {
            this.props.onClick(this, this.props.icon);
        }
    }
    render() {
        return (
            <button className="ui button" onClick={this.onClick.bind(this)}>
                <i className={this.props.icon+' icon'}/>
            </button>
        )
    }
}