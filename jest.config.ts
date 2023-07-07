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
    testRegex: '/tests/.*\\.(test|spec)?\\.ts$',
    moduleFileExtensions: ['ts', 'js', 'json', 'node']
};

export default config;
