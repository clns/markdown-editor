// https://github.com/PrismJS/prism/issues/593
require('../../vendor/prismjs/prism');
require('../../vendor/prismjs/prism.css');

require('cledit/demo/mdGrammar');

export var Prism = window.Prism;

var insideFences = {}
for (var name in Prism.languages) {
    if (Prism.languages.hasOwnProperty(name)) {
        var language = Prism.languages[name]
        if (Prism.util.type(language) === 'Object') {
            insideFences['language-' + name] = {
                pattern: new RegExp('(`{3}|~{3})' + name + '\\W[\\s\\S]*'),
                inside: {
                    'cl cl-pre': /(`{3}|~{3}).*/,
                    rest: language
                }
            }
        }
    }
}

// var noSpellcheckTokens = [
//     'code',
//     'pre',
//     'pre gfm',
//     'math block',
//     'math inline',
//     'math expr block',
//     'math expr inline',
//     'latex block'
// ].cl_reduce(function (noSpellcheckTokens, key) {
//     noSpellcheckTokens[key] = true
//     return noSpellcheckTokens
// }, Object.create(null))
// Prism.hooks.add('wrap', function (env) {
//     if (noSpellcheckTokens[env.type]) {
//         env.attributes.spellcheck = 'false'
//     }
// });
Prism.hooks.add('wrap', function(env) {
    if (/^language-/.test(env.type)) {
        env.classes.push('prism'); // add additional class
    }
});

export var mdGrammar = window.mdGrammar({
    abbrs: true,
    deflists: true,
    dels: true,
    fences: true,
    footnotes: true,
    insideFences: insideFences,
    subs: true,
    sups: true,
    tables: true,
    tocs: false
});