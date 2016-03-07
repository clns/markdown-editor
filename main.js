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

require('./scss/app.scss');

var Pagedown = require("exports?Pagedown!./js/pagedown");
var htmlSanitizer = require("exports?htmlSanitizer!./js/htmlSanitizer");
require('./js/prism');

require('./js/editor');