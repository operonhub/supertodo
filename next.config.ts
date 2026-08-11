import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    /**
     * Fija la raíz en esta carpeta. Sin esto Next sube buscando lockfiles y
     * encuentra el de C:\Users\santi, tomándolo como raíz del workspace.
     */
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
