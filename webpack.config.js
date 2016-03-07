var path = require('path');
var webpack = require('webpack');
var bourbon = require('node-bourbon').includePaths;

var commonsPlugin =
    new webpack.optimize.CommonsChunkPlugin('common.js');

module.exports = {
    entry: [
        './main.js'
    ],
    output: {
        path: path.join(__dirname, 'public'),
        publicPath: '/', // This is used to generate URLs to e.g. images
        filename: 'bundle.js'
    },
    devtool: 'source-map',
    module: {
        loaders: [
            {
                test: /\.js$/,
                loader: 'babel-loader',
                exclude: /(node_modules|vendor)/,
                query: {
                    presets: ['es2015'/*, 'react'*/]
                }
            },
            {
                test: /\.css$/,
                loader: 'style!css?sourceMap'
            },
            {
                test: /\.scss$/,
                loader: 'style!css!resolve-url!sass?sourceMap'
            },
            { test: /\.(png|jpg)$/, loader: 'url-loader?limit=8192' }, // inline base64 URLs for <=8k images, direct URLs for the rest
            {
                test: /\.(woff|woff2)$/,
                loader: "url?limit=5000"
            },
            { test: /\.json$/, loader: "json"},
            { test: /jquery[\\\/]src[\\\/]selector\.js$/, loader: 'amd-define-factory-patcher-loader' }
        ]
    },
    sassLoader: {
        includePaths: [bourbon]
    },
    // resolveUrlLoader: {
    //     root: path.dirname(require.resolve('classets/package'))
    // },
    resolve: {
        // you can now require('file') instead of require('file.coffee')
        extensions: ['', '.js', '.json']
    },
    node: {
        fs: "empty"
    },
    devServer: {
        contentBase: "./public",
        noInfo: true, //  --no-info option
        hot: true,
        inline: true
    },
    plugins: [
        commonsPlugin
    ]
};