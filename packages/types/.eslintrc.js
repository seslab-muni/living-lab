module.exports = {
    root: true,
    extends: ["@repo/eslint-config/library.js"],
    parser: "@typescript-esling/parser",
    parserOptions: {
        tsconfigRootDir: __dirname
    }
}