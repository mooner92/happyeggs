import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'coverage/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
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
