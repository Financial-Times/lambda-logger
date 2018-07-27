module.exports = {
    extends: ['@financial-times/de-tooling', 'prettier'],
    plugins: ['prettier'],
    globals: { awslambda: true },
    rules: {
        'prettier/prettier': 'error',
    },
    parserOptions: {
        sourceType: 'module',
    },
};
