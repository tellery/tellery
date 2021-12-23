import { transform as svgr } from '@svgr/core'
const { readFileSync } = require('fs');

async function compileSvg(source, id, options) {
  const code = await svgr(
    source,
    {
      ...options,
      runtimeConfig: false,
      plugins: ['@svgr/plugin-svgo', '@svgr/plugin-jsx'],
      jsx: {
        babelConfig: {
          plugins: [
            [
              '@babel/plugin-transform-react-jsx',
              {
                useBuiltIns: true,
              },
            ],
          ],
        },
      },
    },
    {
      filePath: id,
    },
  );

  return code;
}

module.exports = (options = {}) => {
  const {
    defaultExport = 'url',
    svgoConfig,
    expandProps,
    svgo,
    ref,
    memo,
    replaceAttrValues,
    svgProps,
    titleProp,
  } = options;

  const cache = new Map();
  const svgRegex = /\.svg(?:\?(component|url))?$/;

  return {
    name: 'react-svg',
    async transform(source, id, isBuild) {
      const result = id.match(svgRegex);

      if (result) {
        const type = result[1];

        if (
          (defaultExport === 'url' && typeof type === 'undefined') ||
          type === 'url'
        ) {
          return source;
        }

        if (
          (defaultExport === 'component' && typeof type === 'undefined') ||
          type === 'component'
        ) {
          const idWithoutQuery = id.replace('.svg?component', '.svg');
          let result = cache.get(idWithoutQuery);

          if (!result) {
            const code = readFileSync(idWithoutQuery);

            result = await compileSvg(code, idWithoutQuery, {
              svgoConfig,
              expandProps,
              svgo,
              ref,
              memo,
              replaceAttrValues,
              svgProps,
              titleProp,
            });

            if (isBuild) {
              cache.set(idWithoutQuery, result);
            }
          }

          return result;
        }
      }
    },
  };
};