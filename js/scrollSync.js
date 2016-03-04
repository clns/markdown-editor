var ScrollSync = function(clEditorSvc, editorElt, previewElt) {
  var
    editorFinishTimeoutId,
    previewFinishTimeoutId,
    skipAnimation,
    isScrollEditor,
    isScrollPreview,
    isEditorMoving,
    isPreviewMoving,
    sectionDescList

  var throttleTimeoutId
  var throttleLastTime = 0

  function throttle (func, wait) {
    clearTimeout(throttleTimeoutId)
    var currentTime = Date.now()
    var localWait = wait + throttleLastTime - currentTime
    throttleTimeoutId = setTimeout(function () {
      throttleLastTime = Date.now()
      func()
    }, localWait < 1 ? 1 : localWait)
  }

  var doScrollSync = function () {
    var localSkipAnimation = skipAnimation/* || !clEditorLayoutSvc.isSidePreviewOpen*/
    skipAnimation = false
    if (/*!clLocalSettingSvc.values.scrollSync || */!sectionDescList || sectionDescList.length === 0) {
      return
    }
    var editorScrollTop = editorElt.scrollTop
    editorScrollTop < 0 && (editorScrollTop = 0)
    var previewScrollTop = previewElt.scrollTop
    var scrollTo
    if (isScrollEditor) {
      // Scroll the preview
      isScrollEditor = false
      editorScrollTop += clEditorSvc.scrollOffset
      sectionDescList.cl_some(function (sectionDesc) {
        if (editorScrollTop < sectionDesc.editorDimension.endOffset) {
          var posInSection = (editorScrollTop - sectionDesc.editorDimension.startOffset) / (sectionDesc.editorDimension.height || 1)
          scrollTo = sectionDesc.previewDimension.startOffset + sectionDesc.previewDimension.height * posInSection - clEditorSvc.scrollOffset
          return true
        }
      })
      scrollTo = Math.min(
        scrollTo,
        previewElt.scrollHeight - previewElt.offsetHeight
      )

      throttle(function () {
        clearTimeout(previewFinishTimeoutId)
        previewElt.clanim
          .scrollTop(scrollTo)
          .duration(!localSkipAnimation && 100)
          .start(function () {
            previewFinishTimeoutId = setTimeout(function () {
              isPreviewMoving = false
            }, 100)
          }, function () {
            isPreviewMoving = true
          })
      }, localSkipAnimation ? 500 : 10)
    } else if (/*!clEditorLayoutSvc.isEditorOpen || */isScrollPreview) {
      // Scroll the editor
      isScrollPreview = false
      previewScrollTop += clEditorSvc.scrollOffset
      sectionDescList.cl_some(function (sectionDesc) {
        if (previewScrollTop < sectionDesc.previewDimension.endOffset) {
          var posInSection = (previewScrollTop - sectionDesc.previewDimension.startOffset) / (sectionDesc.previewDimension.height || 1)
          scrollTo = sectionDesc.editorDimension.startOffset + sectionDesc.editorDimension.height * posInSection - clEditorSvc.scrollOffset
          return true
        }
      })
      scrollTo = Math.min(
        scrollTo,
        editorElt.scrollHeight - editorElt.offsetHeight
      )

      throttle(function () {
        clearTimeout(editorFinishTimeoutId)
        editorElt.clanim
          .scrollTop(scrollTo)
          .duration(!localSkipAnimation && 100)
          .start(function () {
            editorFinishTimeoutId = setTimeout(function () {
              isEditorMoving = false
            }, 100)
          }, function () {
            isEditorMoving = true
          })
      }, localSkipAnimation ? 500 : 10)
    }
  }

  var oldEditorElt, oldPreviewElt
  var isPreviewRefreshing

  function init () {
    if (oldEditorElt === editorElt || oldPreviewElt === previewElt) {
      return
    }
    oldEditorElt = editorElt
    oldPreviewElt = previewElt

    editorElt.addEventListener('scroll', function () {
      if (isEditorMoving) {
        return
      }
      isScrollEditor = true
      isScrollPreview = false
      doScrollSync()
    })

    previewElt.addEventListener('scroll', function () {
      if (isPreviewMoving || isPreviewRefreshing) {
        return
      }
      isScrollPreview = true
      isScrollEditor = false
      doScrollSync()
    })
  }

  var previewHeight, previewContentElt, timeoutId

  clScrollSyncSvc = {
    setEditorElt: function (elt) {
      editorElt = elt
      init()
    },
    setPreviewElt: function (elt) {
      previewElt = elt
      previewContentElt = previewElt.children[0]
      init()
    },
    onContentChanged: function () {
      clearTimeout(timeoutId)
      isPreviewRefreshing = true
      sectionDescList = undefined
    },
    savePreviewHeight: function () {
      previewHeight = previewContentElt.offsetHeight
      previewContentElt.style.height = previewHeight + 'px'
    },
    restorePreviewHeight: function () {
      // Now set the correct height
      previewContentElt.style.removeProperty('height')
      isScrollEditor = /*clEditorLayoutSvc.isEditorOpen*/true
      // A preview scrolling event can occur if height is smaller
      timeoutId = setTimeout(function () {
        isPreviewRefreshing = false
      }, 100)
    },
    onPanelResized: function () {
      // This could happen before the editor/preview panels are created
      if (!editorElt) {
        return
      }
      isScrollEditor = /*clEditorLayoutSvc.isEditorOpen*/true
    },
    onPreviewOpen: function () {
      isScrollEditor = true
      isScrollPreview = false
      skipAnimation = true
    },
    updateSectionDescList: function () {
      sectionDescList = clEditorSvc.sectionDescList
    },
    forceScrollSync: function () {
      if (isPreviewRefreshing) {
        return
      }
      doScrollSync()
    }
  }

  // init editor
  clScrollSyncSvc.setEditorElt(editorElt)
  clEditorSvc.addWatchListener(function(a) {a == 'sectionList' && clScrollSyncSvc.onContentChanged()})

  // init preview
  clScrollSyncSvc.setPreviewElt(previewElt)
  clEditorSvc.addWatchListener(function(a) {a == 'lastConversion' && clScrollSyncSvc.savePreviewHeight()})
  clEditorSvc.addWatchListener(function(a) {a == 'lastPreviewRefreshed' && clScrollSyncSvc.restorePreviewHeight()})
  clEditorSvc.addWatchListener(function(a) {
    a == 'lastSectionMeasured' && function () {
    clScrollSyncSvc.updateSectionDescList()
    clScrollSyncSvc.forceScrollSync()
  }()})
}
