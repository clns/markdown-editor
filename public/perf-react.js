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
            <div style={{height: '100%', position: 'relative'}}>
                <div className="editor">
                    <pre className="editor__inner markdown-highlighting"></pre>
                </div>
                <div className="preview markdown-body">
                    <div className="preview__inner" tabIndex="0"></div>
                </div>
            </div>
        )
    }
}
ReactDOM.render(<User/>, document.body);
