class Toolbar extends React.Component {
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
            <div className="ui basic center aligned segment toolbar">
                <div className="ui compact icon borderless small menu">
                    <Button action="bold" icon="bold" title={title('Bold (KEY+B)')} {...btnProps}/>
                    <Button action="italic" icon="italic" title={title('Italic (KEY+I)')} {...btnProps}/>
                    <div className="divider"></div>
                    <Button action="quote" icon="quote right" title={title('Blockquote (KEY+Q)')} {...btnProps}/>
                    <Button action="code" icon="code" title={title('Code (KEY+K)')} {...btnProps}/>
                    <Button action="link" icon="linkify" title={title('Link (KEY+L)')} {...btnProps}/>
                    <Button action="image" icon="file image outline" title={title('Image (KEY+G)')} {...btnProps}/>
                    <Button action="table" icon="table" title={title('Table (KEY+T)')} {...btnProps}/>
                    <Button action="o list" icon="ordered list" title={title('Ordered List (KEY+O)')} {...btnProps}/>
                    <Button action="u list" icon="unordered list" title={title('Unordered List (KEY+U)')} {...btnProps}/>
                    <Button action="header" icon="header" title={title('Heading (KEY+H)')} {...btnProps}/>
                    <Button action="hr" icon="minus" title={title('Horizontal Line (KEY+R)')} {...btnProps}/>
                    <div className="divider"></div>
                    <Button disabled={!this.props.canUndo} action="undo" icon="undo" title={title('Undo (KEY+Z)')} {...btnProps}/>
                    <Button disabled={!this.props.canRedo} action="redo" icon="repeat" title={title('Redo (KEY+Shift+Z)')} {...btnProps}/>
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
            <a className={'item' + (this.props.disabled?' disabled':'')}
               onClick={this.onClick.bind(this)} title={this.props.title}>
                <i className={this.props.icon+' icon'}/>
            </a>
        )
    }
}

Button.propTypes = {
    disabled: React.PropTypes.bool,
    action: React.PropTypes.string.isRequired,
    icon: React.PropTypes.string.isRequired,
    title: React.PropTypes.string.isRequired,
    onClick: React.PropTypes.func
}

class Link extends React.Component {
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

class User extends React.Component {

    constructor(props) {
        super(props)
        this.state = {
            canUndo: false,
            canRedo: false
        };
    }

    componentDidMount() {
        var editorElt = ReactDOM.findDOMNode(this).querySelector('.editor'),
            editorInnerElt = editorElt.querySelector('.editor__inner'),
            previewElt = ReactDOM.findDOMNode(this).querySelector('.preview'),
            previewInnerElt = previewElt.querySelector('.preview__inner')

        this.editor = new window.Editor(editorElt, editorInnerElt, previewElt, previewInnerElt)

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

        console.log('rendering')

        return (
            <div className="react-root dimmable">
                <Link ref="link"/>
                <div className="page header">
                    <div className="ui container">
                        <div className="ui right floated text menu">
                            <a className="item">
                                Commit
                                <div className="ui label">51</div>
                            </a>
                            <div className="ui right dropdown item">
                                <i className="github large icon"></i>
                                Test
                                <i className="dropdown icon"></i>
                                <div className="menu">
                                    <div className="item">Applications</div>
                                    <div className="item">International Students</div>
                                    <div className="item">Scholarships</div>
                                </div>
                            </div>
                        </div>
                        <div className="ui text menu">
                            <a className="icon item" href="/">
                                <i className="large emphasized  medium icon"></i>
                            </a>
                        </div>
                    </div>
                </div>
                <div className="page ribbon">
                    <div className="ui container">
                        <div className="ui small breadcrumb">
                            <i className="disabled folder open outline icon"></i>
                            <div className="section">_articles</div>
                            <div className="divider"> / </div>
                            <div className="section">develop-on-site-stacker</div>
                            <div className="divider"> / </div>
                            <div className="active section">branching-and-release-workflow.md</div>
                        </div>
                    </div>
                    <div className="ui tabular small menu">
                        <div className="ui container">
                            <a className="active item">
                                <i className="code icon"></i>
                                Content
                            </a>
                            <a className="item">
                                <i className="options icon"></i>
                                YAML Front Matter
                            </a>
                        </div>
                    </div>
                </div>
                <div className="page content">
                    <div className="editor-wrapper">
                        <Toolbar {...toolbarProps}/>
                        <div className="editor">
                            <pre className="editor__inner markdown-highlighting"></pre>
                        </div>
                        <div className="preview markdown-body">
                            <div className="preview__inner" tabIndex="0"></div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}
ReactDOM.render(<User/>, document.querySelector('#root'));
