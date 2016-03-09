require('../../vendor/semantic/dist/components/grid.css')

import React from 'react'
import ReactDOM from 'react-dom'
var $ = require('jquery')

import {Editor as _Editor} from '../editor/editor'
import {Toolbar} from './Toolbar'

export class Editor extends React.Component {
    componentDidMount() {
        var editorElt = ReactDOM.findDOMNode(this.refs.editor),
            previewElt = ReactDOM.findDOMNode(this.refs.preview);

        this.editor = new _Editor(editorElt, previewElt);

        $.get('content.md', data => this.setContent(data));
    }

    setContent(content) {
        if (this.editor) {
            this.editor.setContent(content);
        }
    }

    render() {
        return (
            <div className="ui two column grid" style={{height:'100%', margin:0}}>
                <div className="column">
                    <Toolbar/>
                    <div className="editor" ref="editor">
                        <pre className="editor__inner markdown-highlighting"></pre>
                    </div>
                </div>
                <div className="column preview" ref="preview">
                    <div className="preview__inner" tabIndex="0"></div>
                </div>
            </div>
        )
    }
}
