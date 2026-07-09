import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'coverage/', 'qa/shots/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    // QA 하네스는 Node 스크립트 — Node 전역 허용 (브라우저 소스 아님)
    files: ['qa/**/*.mjs', 'qa/**/*.js', 'scripts/**/*.mjs'],
    languageOptions: {
      globals: { process: 'readonly', console: 'readonly', setTimeout: 'readonly' },
    },
  },
  {
    // 순수 존: Phaser import 금지 — 모델/뷰 분리를 린트로 기계 강제 (docs/02-architecture.md §3)
    files: ['src/systems/**/*.ts', 'src/data/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'phaser',
              message:
                'src/systems/와 src/data/는 순수 TS 존이다 — Phaser는 scenes/·ui/에서만 import한다 (docs/02-architecture.md).',
            },
          ],
          patterns: ['phaser/*'],
        },
      ],
    },
  },
);
