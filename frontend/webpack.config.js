var path = require('path');

module.exports = options => {
  return {
    mode: "production",
    entry: './index.tsx',
    output: {
      filename: 'bundle.js',
    },
    module: {
      rules: [
        {
          test: /.tsx?$/,
          exclude: /node_modules/,
          use: "babel-loader",
        },
        {
          test: /.js$/,
          exclude: /node_modules/,
          use: "babel-loader",
        },
      ],
    },
    resolve: {
      extensions: [".ts", ".tsx", ".js"],
    },
    devServer: {
      static: path.join(__dirname, 'dist'),
      compress: true,
      port: 8080,
    },
  }
}
