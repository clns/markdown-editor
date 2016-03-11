require('../../vendor/semantic/dist/components/grid.css')

import React from 'react'
import ReactDOM from 'react-dom'
var $ = require('jquery')

import {Editor as _Editor} from '../editor/editor'
import Toolbar from './Toolbar'
import Link from './Link'

export class Editor extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            canUndo: false,
            canRedo: false
        };
    }

    componentDidMount() {
        var editorElt = ReactDOM.findDOMNode(this.refs.editor),
            previewElt = ReactDOM.findDOMNode(this.refs.preview)

        this.editor = new _Editor(editorElt, previewElt)

        var checkUndoRedo = function() {
            this.setState({
                canUndo: this.editor.cledit.undoMgr.canUndo(),
                canRedo: this.editor.cledit.undoMgr.canRedo()
            });
        }.bind(this)

        checkUndoRedo()
        this.editor.cledit.undoMgr.on('undoStateChange', checkUndoRedo)

        this.editor.pagedownEditor.hooks.set('insertLinkDialog', (callback) => {
            this.refs.link.show(callback)
            return true
        })

        $.get('content.md', data => this.setContent(data))
    }

    setContent(content) {
        if (this.editor) {
            this.editor.setContent(content, true)
        }
    }

    render() {
        console.log('rendering editor')
        var toolbarProps = {
            canUndo: this.state.canUndo,
            canRedo: this.state.canRedo,
            doBold: () => {
                this.editor.pagedownEditor.uiManager.doClick('bold')
            },
            doItalic: () => {
                this.editor.pagedownEditor.uiManager.doClick('italic')
            },
            doQuote: () => {
                this.editor.pagedownEditor.uiManager.doClick('quote')
            },
            doCode: () => {
                this.editor.pagedownEditor.uiManager.doClick('code')
            },
            doLink: (link) => {
                this.editor.pagedownEditor.uiManager.doClick('link')
            },
            doImage: () => {
                this.editor.pagedownEditor.uiManager.doClick('image')
            },
            doTable: () => {
                this.editor.pagedownEditor.uiManager.doClick('table')
            },
            doOList: () => {
                this.editor.pagedownEditor.uiManager.doClick('olist')
            },
            doUList: () => {
                this.editor.pagedownEditor.uiManager.doClick('ulist')
            },
            doHeader: () => {
                this.editor.pagedownEditor.uiManager.doClick('heading')
            },
            doHr: () => {
                this.editor.pagedownEditor.uiManager.doClick('hr')
            },
            doUndo: () => {
                this.editor.cledit.undoMgr.undo()
            },
            doRedo: () => {
                this.editor.cledit.undoMgr.redo()
            }
        };
        return (
            <div className="ui two column grid" style={{height:'100%', margin:0}}>
                <div className="column">
                    <Link ref="link"/>
                    <Toolbar {...toolbarProps}/>
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
