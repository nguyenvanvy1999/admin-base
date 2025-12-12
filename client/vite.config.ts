import path from 'node:path';

import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

const apiProxyTarget =
    process.env.VITE_API_PROXY_TARGET ??
    process.env.VITE_APP_API_URL ??
    'http://localhost:3000';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            'src': path.resolve(__dirname, './src'),
        },
    },
    server: {
        host: '0.0.0.0',
        port: Number(process.env.VITE_PORT ?? 5173),
        proxy: {
            '/api': {
                target: apiProxyTarget,
                changeOrigin: true,
                secure: false,
            },
        },
    },
    preview: {
        port: Number(process.env.VITE_PREVIEW_PORT ?? 4173),
    },
    build: {
        outDir: 'dist',
        target: 'esnext',
        minify: 'esbuild',
        cssMinify: true,
        sourcemap: false,
        rollupOptions: {
            output: {
                manualChunks: (id) => {
                    if (id.includes('node_modules')) {
                        if (id.includes('react') || id.includes('react-dom')) {
                            return 'react-vendor';
                        }
                        if (id.includes('antd') || id.includes('@ant-design/pro-components')) {
                            return 'antd';
                        }
                        if (id.includes('@tanstack/react-query')) {
                            return 'react-query';
                        }
                        if (id.includes('react-router')) {
                            return 'react-router';
                        }
                        if (id.includes('i18next') || id.includes('react-i18next')) {
                            return 'i18n';
                        }
                        if (id.includes('axios')) {
                            return 'axios';
                        }
                        if (id.includes('dayjs')) {
                            return 'dayjs';
                        }
                        if (id.includes('@ant-design/icons')) {
                            return 'antd-icons';
                        }
                        return 'vendor';
                    }
                },
            },
        },
        chunkSizeWarningLimit: 1000,
    },
});
