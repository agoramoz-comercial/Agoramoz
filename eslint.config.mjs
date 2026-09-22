import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

/** eslint-config-next 16 exporta flat config nativa — sem FlatCompat. */
const config = [
  { ignores: ['.next/**', 'node_modules/**', 'out/**', 'next-env.d.ts', '.qa/**'] },
  ...nextCoreWebVitals,
  ...nextTypescript,
];

export default config;
