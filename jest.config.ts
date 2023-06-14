import type {Config} from 'jest';

const config: Config = {
	preset: 'ts-jest',
    transform: {
        '^.+\\.ts?$': ['ts-jest', {
            babelConfig: false,
            tsconfig: 'tsconfig.json'
        }]
    },
    testEnvironment: 'node',
    testMatch: [
      '**/tests/**/*.[jt]s?(x)',
      '**/?(*.)+(test|spec).[jt]s?(x)'
    ],
    moduleFileExtensions: ['ts', 'js', 'json', 'node']
};

export default config;
