// https://github.com/PrismJS/prism/issues/593
require('./../vendor/prism');
require('./../vendor/prism.css');

var Prism = window.Prism;

var insideFences = {}
Prism.languages.cl_each(function (language, name) {
    if (Prism.util.type(language) === 'Object') {
        insideFences['language-' + name] = {
            pattern: new RegExp('(`{3}|~{3})' + name + '\\W[\\s\\S]*'),
            inside: {
                'cl cl-pre': /(`{3}|~{3}).*/,
                rest: language
            }
        }
    }
});

var noSpellcheckTokens = [
    'code',
    'pre',
    'pre gfm',
    'math block',
    'math inline',
    'math expr block',
    'math expr inline',
    'latex block'
].cl_reduce(function (noSpellcheckTokens, key) {
    noSpellcheckTokens[key] = true
    return noSpellcheckTokens
}, Object.create(null))
Prism.hooks.add('wrap', function (env) {
    if (noSpellcheckTokens[env.type]) {
        env.attributes.spellcheck = 'false'
    }
});