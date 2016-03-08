var $ = require('jquery');

require('./scss/app.scss');
require('./scss/editor.scss');

var Pagedown = require("exports?Pagedown!./js/pagedown");

import {Editor} from './js/editor';
var editor = new Editor(document.querySelector('.editor'), document.querySelector('.preview'));

$.get('content.md', function(data) {
    editor.setContent(data)
})
