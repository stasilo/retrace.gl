const path = require('path');

const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const WriteFilePlugin = require('write-file-webpack-plugin');

module.exports = {
    devtool: 'eval-cheap-module-source-map',
    // entry: ['babel-polyfill', './src/index.js'],
    entry: ['@babel/polyfill', './src/index.js'],
    devServer: {
        port: 8080,
        contentBase: path.join(__dirname, "dist")
    },
    node: {
        fs: 'empty'
    },
    watchOptions: {
        ignored: /node_modules/
    },
    // https://github.com/mobxjs/mobx/issues/1352
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                // loader: 'babel-loader',
                // options: {
                //     presets: ['env'],
                //     plugins: [
                //         'transform-decorators-legacy',
                //         'transform-class-properties',
                //         'babel-plugin-transform-object-rest-spread'
                //     ]
                //}
                loader: 'babel-loader',
                options: {
                    presets: ['@babel/env', '@babel/preset-react'],
                    plugins: [
                        ['@babel/plugin-proposal-decorators', {legacy: true}],
                        ['@babel/plugin-proposal-class-properties', {loose: true}],
                        '@babel/plugin-proposal-object-rest-spread'
                    ]
                }
            }, {
                test: /\.(scss|css)$/,
                use: [
                    {
                        // creates style nodes from JS strings
                        loader: "style-loader",
                        options: {
                            sourceMap: true
                        }
                    }, {
                        // translates CSS into CommonJS
                        loader: "css-loader",
                        options: {
                            sourceMap: true
                        }
                    }, {
                        // compiles Sass to CSS
                        loader: "sass-loader",
                        options: {
                            outputStyle: 'expanded',
                            sourceMap: true,
                            sourceMapContents: true
                        }
                    }
                    // Please note we are not running postcss here
                ]
            }, {
                test: /\.(glsl|vs|fs|vert|frag)$/,
                exclude: /node_modules/,
                use: [
                    'raw-loader',
                    'glslify-loader'
                ]
            }, {
                // Load all images as base64 encoding if they are smaller than 8192 bytes
                test: /\.(png|jpg|gif)$/,
                use: [
                    {
                        loader: 'url-loader',
                        options: {
                            // On development we want to see where the file is coming from, hence we preserve the [path]
                            name: '[path][name].[ext]?hash=[hash:20]',
                            limit: 8192
                        }
                    }
                ]
            }
        ],
    },
    plugins: [
        new WriteFilePlugin(),
        new CopyWebpackPlugin([{
            from: './src/assets/',
            to: 'assets'
        }]),
        new HtmlWebpackPlugin({
            template: './index.html',
            inject: true
        })
    ]
};
