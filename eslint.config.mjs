import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

/** eslint-config-next 16 exporta flat config nativa — sem FlatCompat. */
const config = [
  { ignores: ['.next/**', 'node_modules/**', 'out/**', 'next-env.d.ts', '.qa/**'] },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      /**
       * T-17, XSS a partir das respostas do cliente.
       *
       * O React escapa tudo por omissão; a única forma de furar isso é
       * `dangerouslySetInnerHTML`. A defesa deixa de ser «lembrarmo-nos de não
       * o usar» e passa a ser mecânica. Se algum dia for mesmo preciso — para
       * SVG inline nosso, por exemplo — a supressão fica visível no diff, com
       * a justificação por escrito ao lado.
       */
      'react/no-danger': 'error',
    },
  },
];

export default config;
