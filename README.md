# xibao

[![NPM Version](https://img.shields.io/npm/v/xibao)](https://www.npmjs.com/package/xibao)

一个使用 `nodejs` 合成喜报/悲报图片的小工具, 合成图片基于高效的 [`sharp`](https://sharp.pixelplumbing.com)，仅需数毫秒即可合成一张喜报！

## Usage

```sh
npm i -S xibao
# Or
yarn add xibao
```

```javascript
const { resolve } = require('path')
const { xibao, beibao } = require('xibao')

// 直接提供字符串，每满32个半角字符时会自动换行
xibao('本群已从普通群升级为原神群')
  .then(img => img.toFile(resolve(__dirname, 'xibao.jpg')))
// 提供字符串数组，不会自动换行
beibao(['本群已从原神群', '降级为普通群'])
  .then(img => img.toFile(resolve(__dirname, 'beibao.jpg')))

// 如果你正在使用聊天机器人，你可以直接将图片转成 buffer 后上传/发送
const buffer = await xibao('悲报').jpeg().toBuffer()
// node-mirai-sdk
bot.sendImageMessage(buffer, Group(123456))
// oicq
bot.on('message', message => {
  message.reply([segment.image(buffer)])
})
// koishi
ctx.on('message', session => {
  session.send(h.image(buffer, 'image/jpeg'))
})
// 也可以将 buffer 再转成 base64 后使用
const base64 = 'data:image/jpeg;base64,' + buffer.toString('base64')

```

效果如下

![xibao](docs/xibao.jpg)

![beibao](docs/beibao.jpg)

## 注意事项

单行字数过多，或多行高度过高，背景图装不下时，会自动调整显示的字体大小，但效果不会很好，建议自行限制字数。默认样式下建议最多 32 个中文字符或 64 个英文字符。

## 高级用法

```javascript
const { resolve } = require('path')
const { setFont, custom } = require('xibao')

// 设置字体，会在下一次合成时生效
setFont(resolve(__dirname, 'assets/font.ttf'))
custom({
  background: {
    // 背景图片的路径，建议使用jpg或其他不透明图片，透明png合成jpg背景会变成黑色
    path: resolve(__dirname, 'path/to/background.jpg'),
    width: 114514, // 背景图片的宽度，用于计算文本位置
    height: 1919, // 背景图片的高度
  },
  defaultConfig: { // 默认文本设置, textOrTexts 未设置的选项应用此配置
    color: '#34a4e4', // 字体颜色，可以是 css 颜色，应用于 <svg><path fill="$color" /></svg>
    fontSize: 48, // 字体大小
    strokeColor: 'red', // 描边颜色，应用于 <svg><path stroke="$strokeColor" /></svg>
    strokeSize: 8, // 描边大小
  },
  textOrTexts: [ // 可以是字符串（自动换行）或数组
    '人人实现', // 使用数组时不会自动换行，每个数组成员为一行，使用 defaultConfig 作为配置
    { // 也可以单独配置某一行的内容，未设置的选项会使用 defaultConfig
      text: '喜报自由',
      color: '#66ccff',
      fontSize: 72,
      strokeColor: '#000000',
      strokeSize: 24,
    }
  ],
  lineSpace: 16, // 每行之间的行距
}).then(img => {
  img.toFile(resolve(__dirname, 'docs/custom.png'))
  // Or
  img.toBuffer().then(buffer => console.log(buffer.byteLength)) // ...
})

```

![custom](docs/custom.png)
