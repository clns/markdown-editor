require('bezier-easing');
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
require('cledit/demo/mdGrammar');
require('markdown-it/dist/markdown-it');
require('markdown-it-abbr/dist/markdown-it-abbr');
require('markdown-it-deflist/dist/markdown-it-deflist');
require('markdown-it-emoji/dist/markdown-it-emoji');
require('markdown-it-footnote/dist/markdown-it-footnote');
// require('markdown-it-mathjax/markdown-it-mathjax');
require('markdown-it-pandoc-renderer/markdown-it-pandoc-renderer');
require('markdown-it-sub/dist/markdown-it-sub');
require('markdown-it-sup/dist/markdown-it-sup');

// https://github.com/PrismJS/prism/issues/593
require('./vendor/prism');
require('./vendor/prism.css');


require('./scss/app.scss');

var Pagedown = require("exports?Pagedown!./js/pagedown");
var htmlSanitizer = require("exports?htmlSanitizer!./js/htmlSanitizer");
