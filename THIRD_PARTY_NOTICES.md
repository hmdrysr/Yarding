# Third-party notices

Yarding's own code and documents are dedicated to the public domain under CC0 1.0 (see `LICENSE`). CC0 cannot relicense other people's work, so the following third-party code keeps its own licence.

## Bundled in `index.html`

### qrcode-generator 2.0.4

Used to draw the authenticator setup QR code with no network access. It is embedded in the `<script id="vendor-qrcode">` block of `index.html`. Upstream: https://github.com/kazuhikoarase/qrcode-generator

```
MIT License

Copyright (c) 2009 Kazuhiko Arase
Copyright (c) 2009 Kazuhiko Arase

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

"QR Code" is a registered trademark of DENSO WAVE INCORPORATED.

## Development dependencies (not shipped, only used to run the tests)

These are installed by `npm install` and are not part of the application: `jsdom`, `fake-indexeddb`, `xlsx` (SheetJS Community Edition, used by the tests to read and write spreadsheets), and `jsqr`. Each has its own licence, which is installed with it in `node_modules`. Note that the `xlsx` package on npm is an old SheetJS release with published security advisories; it is used only by the test suite on files the tests generate, never by the application.
