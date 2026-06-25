import type { NextConfig } from 'next'
import path from 'path'
import { createMDX } from 'fumadocs-mdx/next'

const withMDX = createMDX()

const config: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    resolveAlias: {
      child_process: { browser: './src/lib/empty-child-process.ts' },
      'node:child_process': path.resolve(__dirname, 'src/lib/empty-child-process.ts'),
      net:           { browser: './src/lib/empty.js' },
      tls:           { browser: './src/lib/empty.js' },
    },
  },
  webpack(cfg, { isServer }) {
    if (!isServer) {
      cfg.resolve.fallback = {
        ...cfg.resolve.fallback,
        buffer: 'buffer/',
        string_decoder: 'string_decoder',
        events: 'events/',
        stream: false,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        child_process: false,
        net: false,
        tls: false,
      }
      cfg.resolve.alias = {
        ...cfg.resolve.alias,
        'node:buffer': 'buffer/',
        'node:string_decoder': 'string_decoder',
        'node:events': 'events/',
        'node:child_process': path.resolve(__dirname, 'src/lib/empty-child-process.ts'),
      }
    }
    return cfg
  },
}

export default withMDX(config)
