require('../../vendor/semantic/dist/components/button.css')
require('../../vendor/semantic/dist/components/divider.css')
require('../../vendor/semantic/dist/components/icon.css')
require('../../vendor/semantic/dist/components/segment.css')

import React from 'react'

export default class Toolbar extends React.Component {
    doHelp() {
        console.log('help')
    }
    render() {
        var btnProps = {onClick: onClick.bind(this)};

        var isMac = navigator.platform.toUpperCase().indexOf('MAC')>=0;
        var title = function(text) {
            return text.replace('KEY', isMac ? 'Cmd' : 'Ctrl');
        }

        return (
            <div className="ui basic center aligned segment"
            style={{position:'absolute',top:0,left:0,right:0,zIndex:4}}>
                <div className="ui small compact icon buttons">
                    <Button action="bold" icon="bold" title={title('Bold (KEY+B)')} {...btnProps}/>
                    <Button action="italic" icon="italic" title={title('Italic (KEY+I)')} {...btnProps}/>
                </div>
                <div className="ui small compact icon buttons">
                    <Button action="quote" icon="quote right" title={title('Blockquote (KEY+Q)')} {...btnProps}/>
                    <Button action="code" icon="code" title={title('Code (KEY+K)')} {...btnProps}/>
                    <Button action="link" icon="linkify" title={title('Link (KEY+L)')} {...btnProps}/>
                    <Button action="image" icon="file image outline" title={title('Image (KEY+G)')} {...btnProps}/>
                    <Button action="table" icon="table" title={title('Table (KEY+T)')} {...btnProps}/>
                    <Button action="o list" icon="ordered list" title={title('Ordered List (KEY+O)')} {...btnProps}/>
                    <Button action="u list" icon="unordered list" title={title('Unordered List (KEY+U)')} {...btnProps}/>
                    <Button action="header" icon="header" title={title('Heading (KEY+H)')} {...btnProps}/>
                    <Button action="hr" icon="minus" title={title('Horizontal Line (KEY+R)')} {...btnProps}/>
                </div>
                <div className="ui small compact icon buttons">
                    <Button disabled={!this.props.canUndo} action="undo" icon="undo" title={title('Undo (KEY+Z)')} {...btnProps}/>
                    <Button disabled={!this.props.canRedo} action="redo" icon="repeat" title={title('Redo (KEY+Shift+Z)')} {...btnProps}/>
                </div>
                <div className="ui small compact icon buttons">
                    <Button action="undo" icon="help" title={title('Help')} onClick={this.doHelp.bind(this)}/>
                </div>
            </div>
        )
    }
}

Toolbar.propTypes = {
    canUndo: React.PropTypes.bool.isRequired,
    canRedo: React.PropTypes.bool.isRequired,
    doBold: React.PropTypes.func,
    doItalic: React.PropTypes.func,
    doQuote: React.PropTypes.func,
    doCode: React.PropTypes.func,
    doLink: React.PropTypes.func,
    doImage: React.PropTypes.func,
    doTable: React.PropTypes.func,
    doOList: React.PropTypes.func,
    doUList: React.PropTypes.func,
    doHeader: React.PropTypes.func,
    doHr: React.PropTypes.func
};

function onClick(action) {
    action = 'do'+ucwords(action);
    if (this.props[action]) {
        this.props[action]();
    } else {
        alert('no action defined')
    }
}

function ucwords(text) {
    return (text + '')
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/^([a-z\u00E0-\u00FC])|\s+([a-z\u00E0-\u00FC])/g, function($1) {
            return $1.toUpperCase()
        })
        .replace(/\s/g, '')
}

class Button extends React.Component {
    onClick() {
        if (this.props.onClick) {
            this.props.onClick(this.props.action);
        }
    }
    render() {
        return (
            <button className={'ui button' + (this.props.disabled?' disabled':'')} onClick={this.onClick.bind(this)} title={this.props.title}>
                <i className={this.props.icon+' icon'}/>
            </button>
        )
    }
}

Button.propTypes = {
    disabled: React.PropTypes.bool,
    action: React.PropTypes.string.isRequired,
    icon: React.PropTypes.string.isRequired,
    title: React.PropTypes.string.isRequired,
    onClick: React.PropTypes.func
};
