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
        return (
            <div className="react-root dimmable">
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
