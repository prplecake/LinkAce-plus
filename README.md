# LinkAce+

A better firefox add-on for [LinkAce](https://linkace.org).

Current version: 0.0.2

## Usage

* `option` + `p`: Open panel to save bookmark

## Features

* Add bookmark from the popup window.
* Keyboard shortcut Alt+P to open popup window

## Install

Install From [Firefox Add-ons site][amo]

[amo]:https://addons.mozilla.org/en-US/firefox/addon/LinkAce-plus/

## Building from Source

```shell
# install dependencies
yarn install
# build extension
yarn run build
# package extension
pushd dist; zip -r ../LinkAce+-build.zip ./*; popd
```

The built extension will be in `dist/`.

## Thanks

lostsnow, for the [original extension][pb+] for Pinboard.

[pb+]:https://github.com/lostsnow/pinboard-firefox
