var $window = window;

var editorElt, previewElt, tocElt, previewTextStartOffset
var prismOptions = {
  insideFences: insideFences
}
var markdownInitListeners = []
var asyncPreviewListeners = []
var currentFileDao
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
var diffMatchPatch = new $window.diff_match_patch() // eslint-disable-line new-cap
var parsingCtx, conversionCtx,
  tokens

var watchListeners = [];

var clEditorSvc = {
	lastExternalChange: 0,
  scrollOffset: 80,
  insideFences: insideFences,
	options: {},
	onMarkdownInit: function (priority, listener) {
    markdownInitListeners[priority] = listener
  },
	initConverter: function () {
    // Let the markdownInitListeners add the rules
    clEditorSvc.markdown = new $window.markdownit('zero') // eslint-disable-line new-cap
    clEditorSvc.markdown.core.ruler.enable([], true)
    clEditorSvc.markdown.block.ruler.enable([], true)
    clEditorSvc.markdown.inline.ruler.enable([], true)

    asyncPreviewListeners = []
    markdownInitListeners.cl_each(function (listener) {
      listener(clEditorSvc.markdown)
    })
    startSectionBlockTypes.cl_each(function (type) {
      var rule = clEditorSvc.markdown.renderer.rules[type] || clEditorSvc.markdown.renderer.renderToken
      clEditorSvc.markdown.renderer.rules[type] = function (tokens, idx) {
        if (tokens[idx].sectionDelimiter) {
          return htmlSectionMarker + rule.apply(clEditorSvc.markdown.renderer, arguments)
        }
        return rule.apply(clEditorSvc.markdown.renderer, arguments)
      }
    })
  },
  onAsyncPreview: function (listener) {
    asyncPreviewListeners.push(listener)
  },
  setPrismOptions: function (options) {
    prismOptions = prismOptions.cl_extend(options)
    this.prismGrammar = $window.mdGrammar(prismOptions)
    // Create new object to trigger watchers
    this.options = ({}).cl_extend(this.options)
    this.options.highlighter = function (text) {
      return Prism.highlight(text, clEditorSvc.prismGrammar)
    }
  },
  setPreviewElt: function (elt) {
    previewElt = elt
    this.previewElt = elt
  },
  setTocElt: function (elt) {
    tocElt = elt
    this.tocElt = elt
  },
  setEditorElt: function (elt) {
    editorElt = elt
    this.editorElt = elt
    parsingCtx = undefined
    conversionCtx = undefined
    clEditorSvc.sectionDescList = []
    clEditorSvc.textToPreviewDiffs = undefined
    clEditorSvc.cledit = $window.cledit(elt, elt.parentNode)
    clEditorSvc.cledit.on('contentChanged', function (content, sectionList) {
      parsingCtx.sectionList = sectionList
    })
    clEditorSvc.pagedownEditor = clPagedown({
      input: Object.create(clEditorSvc.cledit)
    })
    clEditorSvc.pagedownEditor.run()
    editorElt.addEventListener('focus', function () {
      // if (clEditorLayoutSvc.currentControl === 'menu') {
      //   clEditorLayoutSvc.currentControl = undefined
      // }
    })
  },
  initCledit: function (options) {
    options.sectionParser = function (text) {
      var markdownState = new clEditorSvc.markdown.core.State(text, clEditorSvc.markdown, {})
      var markdownCoreRules = clEditorSvc.markdown.core.ruler.getRules('')
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

      function addSection (maxLine) {
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
    clEditorSvc.cledit.init(options)
  },
  setContent: function (content, isExternal) {
    if (clEditorSvc.cledit) {
      if (isExternal) {
        clEditorSvc.lastExternalChange = Date.now()
      }
      return clEditorSvc.cledit.setContent(content, isExternal)
    }
  },
  addWatchListener: function(cb) {
    watchListeners.push(cb);
    this.watchListeners = watchListeners;
  },
  triggerWatchAction: function(action) {
    if (this.watchListeners) {
      this.watchListeners.forEach(function(cb) {
        cb.call(this, action);
      }, this);
    }
  }
};

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
  clEditorSvc.triggerWatchAction('lastConversion');
}

var anchorHash = {}

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
        sectionPreviewElt.innerHTML = clHtmlSanitizer(html)
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
}

function runAsyncPreview () {
  var imgLoadingListeners = previewElt.querySelectorAll('.cl-preview-section.modified img').cl_map(function (imgElt) {
    return function (cb) {
      if (!imgElt.src) {
        return cb()
      }
      var img = new $window.Image()
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
    clEditorSvc.triggerWatchAction('lastPreviewRefreshed');
    debouncedTextToPreviewDiffs()
    // $rootScope.$apply()
  }
}

var debouncedTextToPreviewDiffs = $window.cledit.Utils.debounce(function () {
  previewTextStartOffset = 0
  clEditorSvc.sectionDescList.cl_each(function (sectionDesc) {
    if (!sectionDesc.textToPreviewDiffs) {
      sectionDesc.previewText = sectionDesc.previewElt.textContent
      sectionDesc.textToPreviewDiffs = diffMatchPatch.diff_main(sectionDesc.section.text, sectionDesc.previewText)
    }
  })
  clEditorSvc.lastTextToPreviewDiffs = Date.now()
  // $rootScope.$apply()
}, 50)

clEditorSvc.getPreviewOffset = function (textOffset) {
  var previewOffset = previewTextStartOffset
  clEditorSvc.sectionDescList.cl_some(function (sectionDesc) {
    if (!sectionDesc.textToPreviewDiffs) {
      previewOffset = undefined
      return true
    }
    if (sectionDesc.section.text.length >= textOffset) {
      previewOffset += diffMatchPatch.diff_xIndex(sectionDesc.textToPreviewDiffs, textOffset)
      return true
    }
    textOffset -= sectionDesc.section.text.length
    previewOffset += sectionDesc.previewText.length
  })
  return previewOffset
}

clEditorSvc.getEditorOffset = function (previewOffset) {
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

var saveSelection = $window.cledit.Utils.debounce(function () {
  var selection = $window.getSelection()
  var range = selection.rangeCount && selection.getRangeAt(0)
  if (range) {
    if (!clEditorSvc.previewElt ||
      !(clEditorSvc.previewElt.compareDocumentPosition(range.startContainer) & $window.Node.DOCUMENT_POSITION_CONTAINED_BY) ||
      !(clEditorSvc.previewElt.compareDocumentPosition(range.endContainer) & $window.Node.DOCUMENT_POSITION_CONTAINED_BY)
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
      var editorStartOffset = clEditorSvc.getEditorOffset(clEditorSvc.previewSelectionStartOffset)
      var editorEndOffset = clEditorSvc.getEditorOffset(clEditorSvc.previewSelectionEndOffset)
      if (editorStartOffset !== undefined && editorEndOffset !== undefined) {
        clEditorSvc.cledit.selectionMgr.setSelectionStartEnd(editorStartOffset, editorEndOffset, false)
      }
    }
    // $rootScope.$apply()
  }
}, 50)

$window.addEventListener('keyup', saveSelection)
$window.addEventListener('mouseup', saveSelection)
$window.addEventListener('contextmenu', saveSelection)

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
var normalizeTocDimensions = dimensionNormalizer('tocDimension')

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
  clEditorSvc.triggerWatchAction('lastSectionMeasured')
}

clEditorSvc.scrollToAnchor = function (anchor) {
  var scrollTop = 0
  var scrollerElt = clEditorSvc.previewElt.parentNode
  var sectionDesc = anchorHash[anchor]
  if (sectionDesc) {
    if (clEditorLayoutSvc.isPreviewVisible) {
      scrollTop = sectionDesc.previewDimension.startOffset - clEditorLayoutSvc.navbarElt.offsetHeight
    } else {
      scrollTop = sectionDesc.editorDimension.startOffset - clEditorSvc.scrollOffset
      scrollerElt = clEditorSvc.editorElt.parentNode
    }
  } else {
    var elt = document.getElementById(anchor)
    if (elt) {
      scrollTop = elt.offsetTop - clEditorLayoutSvc.navbarElt.offsetHeight
    }
  }
  scrollerElt.clanim.scrollTop(scrollTop > 0 ? scrollTop : 0).duration(360).easing('materialOut').start()
}

clEditorSvc.getPandocAst = function () {
  return tokens && $window.markdownitPandocRenderer(tokens, clEditorSvc.markdown.options)
}
