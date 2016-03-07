var editorElt = document.querySelector('.editor')
var editorInnerElt = document.querySelector('.editor__inner')
clEditorSvc.initConverter();
clEditorSvc.setEditorElt(editorInnerElt)
clEditorSvc.pagedownEditor.hooks.set('insertLinkDialog', function (callback) {
  clEditorSvc.linkDialogCallback = callback
  clEditorLayoutSvc.currentControl = 'linkDialog'
  scope.$evalAsync()
  return true
})
clEditorSvc.pagedownEditor.hooks.set('insertImageDialog', function (callback) {
  clEditorSvc.imageDialogCallback = callback
  clEditorLayoutSvc.currentControl = 'imageDialog'
  scope.$evalAsync()
  return true
})

var state
function isDestroyed () {
  return state === 'destroyed'
}

var newSectionList, newSelectionRange
var debouncedEditorChanged = $window.cledit.Utils.debounce(function () {
  if (isDestroyed()) {
    return
  }
  if (clEditorSvc.sectionList !== newSectionList) {
    clEditorSvc.sectionList = newSectionList
    clEditorSvc.triggerWatchAction('sectionList');
    state ? debouncedRefreshPreview() : refreshPreview()
  }
  clEditorSvc.selectionRange = newSelectionRange
  // scope.currentFileDao.contentDao.text = clEditorSvc.cledit.getContent()
  // saveState()
  clEditorSvc.lastContentChange = Date.now()
  // scope.$apply()
}, 10)

function refreshPreview () {
  state = 'ready'
  clEditorSvc.convert()
  setTimeout(clEditorSvc.refreshPreview, 10)
}

var debouncedRefreshPreview = $window.cledit.Utils.debounce(function () {
  if (!isDestroyed()) {
    refreshPreview()
  }
}, 20)

clEditorSvc.cledit.selectionMgr.on('selectionChanged', function (start, end, selectionRange) {
  newSelectionRange = selectionRange
  debouncedEditorChanged()
})

clEditorSvc.cledit.on('contentChanged', function (content, sectionList) {
  newSectionList = sectionList
  debouncedEditorChanged()
})

function onPreviewRefreshed (refreshed) {
  if (refreshed && !clEditorSvc.lastSectionMeasured) {
    clEditorSvc.measureSectionDimensions()
  } else {
    debouncedMeasureSectionDimension()
  }
}

var debouncedMeasureSectionDimension = $window.cledit.Utils.debounce(function () {
  if (!isDestroyed()) {
    clEditorSvc.measureSectionDimensions()
    // scope.$apply()
  }
}, 500)

clEditorSvc.addWatchListener(function(a) {a == 'lastPreviewRefreshed' && onPreviewRefreshed()})

clEditorSvc.initCledit(clEditorSvc.options);

Keystrokes(clEditorSvc);


// Preview

(function() {
  var appUri = ''
  clEditorSvc.setPreviewElt(document.querySelector('.preview__inner'))
  var previewElt = document.querySelector('.preview')
  clEditorSvc.isPreviewTop = previewElt.scrollTop < 10
  previewElt.addEventListener('scroll', function () {
    var isPreviewTop = previewElt.scrollTop < 10
    if (isPreviewTop !== clEditorSvc.isPreviewTop) {
      clEditorSvc.isPreviewTop = isPreviewTop
    }
  })
  previewElt.addEventListener('click', function (evt) {
    var elt = evt.target
    while (elt !== previewElt) {
      if (elt.href) {
        if (elt.href.match(/^https?:\/\//) && elt.href.slice(0, appUri.length) !== appUri) {
          evt.preventDefault()
          var wnd = window.open(elt.href, '_blank')
          return wnd.focus()
        }
      }
      elt = elt.parentNode
    }
  })
})();


// Scroll Sync

ScrollSync(clEditorSvc, document.querySelector('.editor'), document.querySelector('.preview'))


// Content

$.get('content.md', function(data) {
  clEditorSvc.setContent(data)
})
