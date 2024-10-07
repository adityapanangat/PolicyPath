import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

// Use default import for webpack and destructure ProvidePlugin
import webpack from 'webpack';
const { ProvidePlugin } = webpack;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
    mode: 'development', // Change this to 'production' for a production build
    entry: './public/globe.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'public/dist'), // Use __dirname for correct path resolution
        clean: true,
    },
    module: {
        rules: [
            {
                test: /\.(jpg|jpeg|png|gif|svg)$/,
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            name: '[path][name].[ext]',
                        },
                    },
                ],
            },
            {
                test: /\.glsl$/, // Add this rule for GLSL files
                use: 'raw-loader', // Use raw-loader for GLSL files
            },
        ],
    },
    performance: {
        hints: false,
    },
    plugins: [
        new ProvidePlugin({
            global: 'global', // Provide the global variable
        }),
    ],
};
