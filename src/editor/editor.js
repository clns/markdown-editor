require('./editor.scss');

window.BezierEasing = require('bezier-easing');
require('clanim/clanim');
require('imports?this=>window!googlediff/javascript/diff_match_patch_uncompressed'); // Needs to come before cldiffutils and cledit
// require('clunderscore/clunderscore'); // Needs to come before cledit
require('cldiffutils/cldiffutils');
require('cledit/scripts/cleditCore');
require('cledit/scripts/cleditHighlighter');
require('cledit/scripts/cleditKeystroke');
require('cledit/scripts/cleditMarker');
require('cledit/scripts/cleditSelectionMgr');
require('cledit/scripts/cleditUndoMgr');
require('cledit/scripts/cleditUtils');
require('cledit/scripts/cleditWatcher');
var MarkdownIt = require('markdown-it')
var mdPlugins = [
    require('markdown-it-abbr'),
    require('markdown-it-deflist'),
    require('markdown-it-emoji'),
    require('markdown-it-footnote'),
    require('markdown-it-sub'),
    require('markdown-it-sup')
]
import {Prism, mdGrammar} from './prism';
var htmlSanitizer = require("exports?htmlSanitizer!./htmlSanitizer")
var ScrollSync = require("exports?ScrollSync!./scrollSync")
var Keystrokes = require("exports?Keystrokes!./keystrokes")
var clPagedown = require("exports?Pagedown!./pagedown")
import {rootScope} from './scope'

export class Editor {
    constructor(editorElt, editorInnerElt, previewWrapperElt, previewElt) {
        this.lastExternalChange = 0
        this.scrollOffset = 0

        var md = this.markdown = new MarkdownIt({
            html: true,
            breaks: true,
            linkify: false,
            typographer: true,
            langPrefix: 'prism language-'
        })
        md.disable([
            'strikethrough'
        ]);

        mdPlugins.forEach(p => md.use(p));

        // Transform style into align attribute to pass the HTML sanitizer
        var textAlignLength = 'text-align:'.length
        md.renderer.rules.th_open = md.renderer.rules.td_open = function (tokens, idx, options) {
            var token = tokens[idx]
            if (token.attrs && token.attrs.length && token.attrs[0][0] === 'style') {
                token.attrs = [
                    ['align', token.attrs[0][1].slice(textAlignLength)]
                ]
            }
            return md.renderer.renderToken(tokens, idx, options)
        }

        md.renderer.rules.footnote_ref = function (tokens, idx) {
            var n = Number(tokens[idx].meta.id + 1).toString()
            var id = 'fnref' + n
            if (tokens[idx].meta.subId > 0) {
                id += ':' + tokens[idx].meta.subId
            }
            return '<sup class="footnote-ref"><a href="#fn' + n + '" id="' + id + '">' + n + '</a></sup>'
        }

        var clEditorSvc = rootScope.editorSvc = this;
        var diffMatchPatch = new window.diff_match_patch()
        var parsingCtx = {}, conversionCtx,
            tokens
        var previewTextStartOffset
        var asyncPreviewListeners = []
        var startSectionBlockTypes = [
            'paragraph_open',
            'blockquote_open',
            'heading_open',
            'code',
            'fence',
            'table_open',
            'html_block',
            'bullet_list_open',
            'ordered_list_open',
            'hr',
            'dl_open',
            'toc'
        ]
        var startSectionBlockTypeMap = startSectionBlockTypes.cl_reduce(function (map, type) {
            map[type] = true
            return map
        }, Object.create(null))
        var htmlSectionMarker = '\uF111\uF222\uF333\uF444'

        startSectionBlockTypes.cl_each(function (type) {
            var rule = md.renderer.rules[type] || md.renderer.renderToken
            md.renderer.rules[type] = function (tokens, idx) {
                if (tokens[idx].sectionDelimiter) {
                    return htmlSectionMarker + rule.apply(md.renderer, arguments)
                }
                return rule.apply(md.renderer, arguments)
            }
        })

        asyncPreviewListeners.push(function (cb) {
            previewElt.querySelectorAll('.prism').cl_each(function (elt) {
                !elt.highlighted && Prism.highlightElement(elt)
                elt.highlighted = true
            })
            cb()
        })

        this.cledit = window.cledit(editorInnerElt, editorElt)

        clEditorSvc.pagedownEditor = new clPagedown({
            input: Object.create(clEditorSvc.cledit)
        })
        clEditorSvc.pagedownEditor.run()

        inlineImages.call(this);

        function saveState () {
            localStorage.state = JSON.stringify({
                selectionStart: clEditorSvc.cledit.selectionMgr.selectionStart,
                selectionEnd: clEditorSvc.cledit.selectionMgr.selectionEnd,
                scrollTop: editorElt.scrollTop
            })
        }
        editorElt.addEventListener('scroll', saveState)

        var state
        var newSectionList, newSelectionRange
        var debouncedEditorChanged = window.cledit.Utils.debounce(function () {
            if (clEditorSvc.sectionList !== newSectionList) {
                clEditorSvc.sectionList = newSectionList
                state ? debouncedRefreshPreview() : refreshPreview()
            }
            clEditorSvc.selectionRange = newSelectionRange
            // scope.currentFileDao.contentDao.text = clEditorSvc.cledit.getContent()
            saveState()
            clEditorSvc.lastContentChange = Date.now()
            rootScope.$apply()
        }, 10)

        function refreshPreview () {
            state = 'ready'
            clEditorSvc.convert()
            setTimeout(clEditorSvc.refreshPreview, 10)
        }

        var debouncedRefreshPreview = window.cledit.Utils.debounce(function () {
            // if (!isDestroyed()) {
                refreshPreview()
                rootScope.$apply()
            // }
        }, 20)

        function hashArray (arr, valueHash, valueArray) {
            var hash = []
            arr.cl_each(function (str) {
                var strHash = valueHash[str]
                if (strHash === undefined) {
                    strHash = valueArray.length
                    valueArray.push(str)
                    valueHash[str] = strHash
                }
                hash.push(strHash)
            })
            return String.fromCharCode.apply(null, hash)
        }

        clEditorSvc.convert = function () {
            if (!parsingCtx.markdownState.isConverted) { // Convert can be called twice without editor modification
                parsingCtx.markdownCoreRules.slice(2).cl_each(function (rule) { // Skip previously passed rules
                    rule(parsingCtx.markdownState)
                })
                parsingCtx.markdownState.isConverted = true
            }
            tokens = parsingCtx.markdownState.tokens
            var html = clEditorSvc.markdown.renderer.render(
                tokens,
                clEditorSvc.markdown.options,
                parsingCtx.markdownState.env
            )
            var htmlSectionList = html.split(htmlSectionMarker)
            htmlSectionList[0] === '' && htmlSectionList.shift()
            var valueHash = Object.create(null)
            var valueArray = []
            var newSectionHash = hashArray(htmlSectionList, valueHash, valueArray)
            var htmlSectionDiff = [
                [1, newSectionHash]
            ]
            if (conversionCtx) {
                var oldSectionHash = hashArray(conversionCtx.htmlSectionList, valueHash, valueArray)
                htmlSectionDiff = diffMatchPatch.diff_main(oldSectionHash, newSectionHash, false)
            }
            conversionCtx = {
                sectionList: parsingCtx.sectionList,
                htmlSectionList: htmlSectionList,
                htmlSectionDiff: htmlSectionDiff
            }
            clEditorSvc.lastConversion = Date.now()
        };

        clEditorSvc.refreshPreview = function () {
            var newSectionDescList = []
            var sectionPreviewElt, sectionTocElt
            var sectionIdx = 0
            var sectionDescIdx = 0
            var insertBeforePreviewElt = previewElt.firstChild
            // var insertBeforeTocElt = tocElt.firstChild
            conversionCtx.htmlSectionDiff.cl_each(function (item) {
                for (var i = 0; i < item[1].length; i++) {
                    var section = conversionCtx.sectionList[sectionIdx]
                    if (item[0] === 0) {
                        var sectionDesc = clEditorSvc.sectionDescList[sectionDescIdx++]
                        sectionDesc.editorElt = section.elt
                        newSectionDescList.push(sectionDesc)
                        sectionIdx++
                        insertBeforePreviewElt.classList.remove('modified')
                        insertBeforePreviewElt = insertBeforePreviewElt.nextSibling
                        // insertBeforeTocElt.classList.remove('modified')
                        // insertBeforeTocElt = insertBeforeTocElt.nextSibling
                    } else if (item[0] === -1) {
                        sectionDescIdx++
                        sectionPreviewElt = insertBeforePreviewElt
                        insertBeforePreviewElt = insertBeforePreviewElt.nextSibling
                        previewElt.removeChild(sectionPreviewElt)
                        // sectionTocElt = insertBeforeTocElt
                        // insertBeforeTocElt = insertBeforeTocElt.nextSibling
                        // tocElt.removeChild(sectionTocElt)
                    } else if (item[0] === 1) {
                        var html = conversionCtx.htmlSectionList[sectionIdx++]

                        // Create preview section element
                        sectionPreviewElt = document.createElement('div')
                        sectionPreviewElt.className = 'cl-preview-section modified'
                        sectionPreviewElt.innerHTML = htmlSanitizer(html)
                        if (insertBeforePreviewElt) {
                            previewElt.insertBefore(sectionPreviewElt, insertBeforePreviewElt)
                        } else {
                            previewElt.appendChild(sectionPreviewElt)
                        }

                        // Create TOC section element
                        // sectionTocElt = document.createElement('div')
                        // sectionTocElt.className = 'cl-toc-section modified'
                        // var headingElt = sectionPreviewElt.querySelector('h1, h2, h3, h4, h5, h6')
                        // if (headingElt) {
                        //   headingElt = headingElt.cloneNode(true)
                        //   headingElt.removeAttribute('id')
                        //   sectionTocElt.appendChild(headingElt)
                        // }
                        // if (insertBeforeTocElt) {
                        //   tocElt.insertBefore(sectionTocElt, insertBeforeTocElt)
                        // } else {
                        //   tocElt.appendChild(sectionTocElt)
                        // }

                        newSectionDescList.push({
                            section: section,
                            editorElt: section.elt,
                            previewElt: sectionPreviewElt
                            // tocElt: sectionTocElt
                        })
                    }
                }
            })
            clEditorSvc.sectionDescList = newSectionDescList
            // tocElt.classList[tocElt.querySelector('.cl-toc-section *') ? 'remove' : 'add']('toc-tab--empty')
            runAsyncPreview()
        };

        function runAsyncPreview () {
            var imgLoadingListeners = previewElt.querySelectorAll('.cl-preview-section.modified img').cl_map(function (imgElt) {
                return function (cb) {
                    if (!imgElt.src) {
                        return cb()
                    }
                    var img = new window.Image()
                    img.onload = cb
                    img.onerror = cb
                    img.src = imgElt.src
                }
            })
            var listeners = asyncPreviewListeners.concat(imgLoadingListeners)
            var resolved = 0

            function attemptResolve () {
                if (++resolved === listeners.length) {
                    resolve()
                }
            }
            listeners.cl_each(function (listener) {
                listener(attemptResolve)
            })

            function resolve () {
                var html = previewElt.querySelectorAll('.cl-preview-section').cl_reduce(function (html, elt) {
                    if (!elt.exportableHtml) {
                        var clonedElt = elt.cloneNode(true)
                        clonedElt.querySelectorAll('.MathJax, .MathJax_Display, .MathJax_Preview').cl_each(function (elt) {
                            elt.parentNode.removeChild(elt)
                        })
                        elt.exportableHtml = clonedElt.innerHTML
                    }
                    return html + elt.exportableHtml
                }, '')
                clEditorSvc.previewHtml = html.replace(/^\s+|\s+$/g, '')
                clEditorSvc.previewText = previewElt.textContent
                clEditorSvc.lastPreviewRefreshed = Date.now()
                debouncedTextToPreviewDiffs()
                rootScope.$apply()
            }
        }

        var debouncedTextToPreviewDiffs = window.cledit.Utils.debounce(function () {
            previewTextStartOffset = 0
            clEditorSvc.sectionDescList.cl_each(function (sectionDesc) {
                if (!sectionDesc.textToPreviewDiffs) {
                    sectionDesc.previewText = sectionDesc.previewElt.textContent
                    sectionDesc.textToPreviewDiffs = diffMatchPatch.diff_main(sectionDesc.section.text, sectionDesc.previewText)
                }
            })
            clEditorSvc.lastTextToPreviewDiffs = Date.now()
            rootScope.$apply()
        }, 50)

        var getEditorOffset = function (previewOffset) {
            previewOffset -= previewTextStartOffset
            var editorOffset = 0
            clEditorSvc.sectionDescList.cl_some(function (sectionDesc) {
                if (!sectionDesc.textToPreviewDiffs) {
                    editorOffset = undefined
                    return true
                }
                if (sectionDesc.previewText.length >= previewOffset) {
                    var previewToTextDiffs = sectionDesc.textToPreviewDiffs.cl_map(function (diff) {
                        return [-diff[0], diff[1]]
                    })
                    editorOffset += diffMatchPatch.diff_xIndex(previewToTextDiffs, previewOffset)
                    return true
                }
                previewOffset -= sectionDesc.previewText.length
                editorOffset += sectionDesc.section.text.length
            })
            return editorOffset
        }

        var saveSelection = window.cledit.Utils.debounce(function () {
            var selection = window.getSelection()
            var range = selection.rangeCount && selection.getRangeAt(0)
            if (range) {
                if (!previewElt ||
                    !(previewElt.compareDocumentPosition(range.startContainer) & window.Node.DOCUMENT_POSITION_CONTAINED_BY) ||
                    !(previewElt.compareDocumentPosition(range.endContainer) & window.Node.DOCUMENT_POSITION_CONTAINED_BY)
                ) {
                    range = undefined
                }
            }
            if (clEditorSvc.previewSelectionRange !== range) {
                clEditorSvc.previewSelectionRange = range
                clEditorSvc.previewSelectionStartOffset = undefined
                clEditorSvc.previewSelectionEndOffset = undefined
                if (range) {
                    var startRange = document.createRange()
                    startRange.setStart(previewElt, 0)
                    startRange.setEnd(range.startContainer, range.startOffset)
                    clEditorSvc.previewSelectionStartOffset = ('' + startRange.toString()).length
                    clEditorSvc.previewSelectionEndOffset = clEditorSvc.previewSelectionStartOffset + ('' + range.toString()).length
                    var editorStartOffset = getEditorOffset(clEditorSvc.previewSelectionStartOffset)
                    var editorEndOffset = getEditorOffset(clEditorSvc.previewSelectionEndOffset)
                    if (editorStartOffset !== undefined && editorEndOffset !== undefined) {
                        clEditorSvc.cledit.selectionMgr.setSelectionStartEnd(editorStartOffset, editorEndOffset, false)
                    }
                }
                rootScope.$apply()
            }
        }, 50)

        window.addEventListener('keyup', saveSelection)
        window.addEventListener('mouseup', saveSelection)
        window.addEventListener('contextmenu', saveSelection)

        function SectionDimension (startOffset, endOffset) {
            this.startOffset = startOffset
            this.endOffset = endOffset
            this.height = endOffset - startOffset
        }

        function dimensionNormalizer (dimensionName) {
            return function () {
                var dimensionList = clEditorSvc.sectionDescList.cl_map(function (sectionDesc) {
                    return sectionDesc[dimensionName]
                })
                var dimension, i, j
                for (i = 0; i < dimensionList.length; i++) {
                    dimension = dimensionList[i]
                    if (!dimension.height) {
                        continue
                    }
                    for (j = i + 1; j < dimensionList.length && dimensionList[j].height === 0; j++) {
                    }
                    var normalizeFactor = j - i
                    if (normalizeFactor === 1) {
                        continue
                    }
                    var normalizedHeight = dimension.height / normalizeFactor
                    dimension.height = normalizedHeight
                    dimension.endOffset = dimension.startOffset + dimension.height
                    for (j = i + 1; j < i + normalizeFactor; j++) {
                        var startOffset = dimension.endOffset
                        dimension = dimensionList[j]
                        dimension.startOffset = startOffset
                        dimension.height = normalizedHeight
                        dimension.endOffset = dimension.startOffset + dimension.height
                    }
                    i = j - 1
                }
            }
        }

        var normalizeEditorDimensions = dimensionNormalizer('editorDimension')
        var normalizePreviewDimensions = dimensionNormalizer('previewDimension')
        // var normalizeTocDimensions = dimensionNormalizer('tocDimension')

        clEditorSvc.measureSectionDimensions = function () {
            var editorSectionOffset = 0
            var previewSectionOffset = 0
            var tocSectionOffset = 0
            var sectionDesc = clEditorSvc.sectionDescList[0]
            var nextSectionDesc
            for (var i = 1; i < clEditorSvc.sectionDescList.length; i++) {
                nextSectionDesc = clEditorSvc.sectionDescList[i]

                // Measure editor section
                var newEditorSectionOffset = nextSectionDesc.editorElt && nextSectionDesc.editorElt.firstChild ? nextSectionDesc.editorElt.firstChild.offsetTop : editorSectionOffset
                newEditorSectionOffset = newEditorSectionOffset > editorSectionOffset ? newEditorSectionOffset : editorSectionOffset
                sectionDesc.editorDimension = new SectionDimension(editorSectionOffset, newEditorSectionOffset)
                editorSectionOffset = newEditorSectionOffset

                // Measure preview section
                var newPreviewSectionOffset = nextSectionDesc.previewElt ? nextSectionDesc.previewElt.offsetTop : previewSectionOffset
                newPreviewSectionOffset = newPreviewSectionOffset > previewSectionOffset ? newPreviewSectionOffset : previewSectionOffset
                sectionDesc.previewDimension = new SectionDimension(previewSectionOffset, newPreviewSectionOffset)
                previewSectionOffset = newPreviewSectionOffset

                // Measure TOC section
                // var newTocSectionOffset = nextSectionDesc.tocElt ? nextSectionDesc.tocElt.offsetTop + nextSectionDesc.tocElt.offsetHeight / 2 : tocSectionOffset
                // newTocSectionOffset = newTocSectionOffset > tocSectionOffset ? newTocSectionOffset : tocSectionOffset
                // sectionDesc.tocDimension = new SectionDimension(tocSectionOffset, newTocSectionOffset)
                // tocSectionOffset = newTocSectionOffset

                sectionDesc = nextSectionDesc
            }

            // Last section
            sectionDesc = clEditorSvc.sectionDescList[i - 1]
            if (sectionDesc) {
                sectionDesc.editorDimension = new SectionDimension(editorSectionOffset, editorElt.scrollHeight)
                sectionDesc.previewDimension = new SectionDimension(previewSectionOffset, previewElt.scrollHeight)
                // sectionDesc.tocDimension = new SectionDimension(tocSectionOffset, tocElt.scrollHeight)
            }

            normalizeEditorDimensions()
            normalizePreviewDimensions()
            // normalizeTocDimensions()

            clEditorSvc.lastSectionMeasured = Date.now()
        }

        clEditorSvc.cledit.on('contentChanged', function (content, sectionList) {
            parsingCtx.sectionList = sectionList
            newSectionList = sectionList
            debouncedEditorChanged()
        })

        clEditorSvc.cledit.selectionMgr.on('selectionChanged', function (start, end, selectionRange) {
            newSelectionRange = selectionRange
            debouncedEditorChanged()
        })

        function onPreviewRefreshed (refreshed) {
            if (refreshed && !clEditorSvc.lastSectionMeasured) {
                clEditorSvc.measureSectionDimensions()
            } else {
                debouncedMeasureSectionDimension()
            }
        }

        var debouncedMeasureSectionDimension = window.cledit.Utils.debounce(function () {
            // if (!isDestroyed()) {
                clEditorSvc.measureSectionDimensions()
                rootScope.$apply()
            // }
        }, 500)

        rootScope.$watch('editorSvc.lastPreviewRefreshed', onPreviewRefreshed)

        var options = {
            highlighter: function(text) {
                return Prism.highlight(text, mdGrammar)
            },
            sectionParser: function (text) {
                var markdownState = new md.core.State(text, md, {})
                var markdownCoreRules = md.core.ruler.getRules('')
                markdownCoreRules[0](markdownState) // Pass the normalize rule
                markdownCoreRules[1](markdownState) // Pass the block rule
                var lines = text.split('\n')
                lines.pop() // Assume last char is a '\n'
                var sections = []
                var i = 0
                parsingCtx = {
                    markdownState: markdownState,
                    markdownCoreRules: markdownCoreRules
                }

                function addSection(maxLine) {
                    var section = ''
                    for (; i < maxLine; i++) {
                        section += lines[i] + '\n'
                    }
                    section && sections.push(section)
                }

                markdownState.tokens.cl_each(function (token, index) {
                    // index === 0 means there are empty lines at the begining of the file
                    if (token.level === 0 && index > 0 && startSectionBlockTypeMap[token.type]) {
                        token.sectionDelimiter = true
                        addSection(token.map[0])
                    }
                })
                addSection(lines.length)
                return sections
            }
        };

        var savedState = localStorage.state ? JSON.parse(localStorage.state) : {};
        ['selectionStart', 'selectionEnd', 'scrollTop'].cl_each(function (key) {
            if (typeof savedState[key] !== 'undefined') {
                options[key] = savedState[key]
            }
        });

        this.cledit.init(options)

        ScrollSync(clEditorSvc, editorElt, previewWrapperElt);
        Keystrokes(clEditorSvc);
    }

    setContent(content, isExternal) {
        if (this.cledit) {
            if (isExternal) {
                this.lastExternalChange = Date.now()
            }
            return this.cledit.setContent(content, isExternal)
        }
    }
}

// Displays inline images in the editor. Should be called
// after cledit is created, before initialization.
function inlineImages() {
    var editorInnerElt = this.cledit.$contentElt
    var imgCache = Object.create(null)
    var imgEltsToCache = []

    function addToImgCache (imgElt) {
        var entries = imgCache[imgElt.src]
        if (!entries) {
            entries = []
            imgCache[imgElt.src] = entries
        }
        entries.push(imgElt)
    }

    function getFromImgCache (src) {
        var entries = imgCache[src]
        if (entries) {
            var imgElt
            return entries.cl_some(function (entry) {
                    if (!editorInnerElt.contains(entry)) {
                        imgElt = entry
                        return true
                    }
                }) && imgElt
        }
    }

    var triggerImgCacheGc = window.cledit.Utils.debounce(function () {
        Object.keys(imgCache).cl_each(function (src) {
            var entries = imgCache[src].filter(function (imgElt) {
                return editorInnerElt.contains(imgElt)
            })
            if (entries.length) {
                imgCache[src] = entries
            } else {
                delete imgCache[src]
            }
        })
    }, 100)

    this.cledit.highlighter.on('sectionHighlighted', function (section) {
        section.elt.getElementsByClassName('token img').cl_each(function (imgTokenElt) {
            var srcElt = imgTokenElt.querySelector('.token.cl-src')
            if (srcElt) {
                // Create an img element before the .img.token and wrap both elements into a .token.img-wrapper
                var imgElt = document.createElement('img')
                imgElt.style.display = 'none'
                var uri = srcElt.textContent
                imgElt.onload = function () {
                    imgElt.style.display = ''
                }
                imgElt.src = uri
                imgEltsToCache.push(imgElt)
                var imgTokenWrapper = document.createElement('span')
                imgTokenWrapper.className = 'token img-wrapper'
                imgTokenElt.parentNode.insertBefore(imgTokenWrapper, imgTokenElt)
                imgTokenWrapper.appendChild(imgElt)
                imgTokenWrapper.appendChild(imgTokenElt)
            }
        })
    })

    this.cledit.highlighter.on('highlighted', function () {
        imgEltsToCache.cl_each(function (imgElt) {
            var cachedImgElt = getFromImgCache(imgElt.src)
            if (cachedImgElt) {
                // Found a previously loaded image that has just been released
                imgElt.parentNode.replaceChild(cachedImgElt, imgElt)
            } else {
                addToImgCache(imgElt)
            }
        })
        imgEltsToCache = []
        // Eject released images from cache
        triggerImgCacheGc()
    })
}
window.Editor = Editor;