const path = require('path');

module.exports = {
    mode: 'development',
    target: 'web',
    devtool: 'inline-source-maps',
    entry: ['./src/scripts/index.tsx', './src/style/index.styl'],
    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            },
            {
                test: /\.styl$/,
                use: [
                    { loader: 'style-loader' },
                    { loader: 'css-loader' },
                    { loader: 'stylus-loader' }
                ]
            }
        ]
    },
    plugins: [],
    context: path.resolve(__dirname),
    output: {
        path: path.resolve(__dirname),
        filename: 'index.js',
    },
    devServer: {
        host: 'localhost',
        publicPath: '/',
        compress: true,
        open: true,
        port: 80
    }
};