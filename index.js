const { resolve } = require('path')
const sharp = require('sharp')
const TextToSVG = require('text-to-svg')

/**
 * @type { { fontfile: string, loadedFontfile: string, instance: TextToSVG } }
 */
const t2sConfig = {
  fontfile: resolve(__dirname, 'assets/font.ttf'),
  loadedFontfile: '',
  instance: null
}
const getT2s = () => {
  if (!t2sConfig.instance || t2sConfig.fontfile !== t2sConfig.loadedFontfile) {
    t2sConfig.instance = TextToSVG.loadSync(t2sConfig.fontfile)
    t2sConfig.loadedFontfile = t2sConfig.fontfile
  }
  return t2sConfig.instance
}

const xibaoSize = {
  width: 1292,
  height: 968
}
const beibaoSize = {
  width: 1300,
  height: 974
}

/**
 * @typedef SvgOption
 * @property { string } text
 * @property { string } color
 * @property { string } strokeColor
 * @property { number } strokeSize
 * @property { number } fontSize
 *
 * @function textSvg
 * @param { SvgOption } option
 */
const textSvg = (option) => {
  const { text, fontSize, color, strokeSize, strokeColor } = option
  const t2s = getT2s()
  const svg = t2s.getSVG(text, {
    fontSize,
    x: Math.ceil(strokeSize / 2),
    y: 0,
    anchor: 'top',
    attributes: {
      fill: color,
      stroke: strokeColor,
      'stroke-width': strokeSize,
      'paint-order': 'stroke'
    }
  })
  const width = parseInt(svg.match(/width="(\d+)/)?.[1]);
  const height = parseInt(svg.match(/height="(\d+)/)?.[1]);
  return {
    width: width + strokeSize,
    height,
    svg: svg.replace(`width="${width}`, `width="${width + strokeSize}`)
  }
}

/**
 * @function generateImage
 * @param { string } background
 * @param { { width: number, height: number } } size
 * @param { { width: number, height: number, svg: string }[] } svgs
 * @param { number } [lineSpace]
 */
const generateImage = async (background, { width, height }, svgs, lineSpace = 16) => {
  const bg = sharp(background)
  const toDraws = svgs.map(svg => {
    let scale = 1
    if (svg.width > width) {
      scale = width / svg.width
    }
    if (svg.height > height) {
      const _s = height / svg.height
      if (_s < scale) scale = _s
    }
    return {
      scale,
      realWidth: Math.floor(svg.width * scale),
      realHeight: Math.floor(svg.height * scale),
      ...svg
    }
  })
  const totalHeight = toDraws.reduce((prev, cur) => {
    return prev + cur.realHeight + lineSpace
  }, -lineSpace)
  let globalScale = 1
  if (totalHeight > height) {
    globalScale = height / totalHeight
    console.warn(`Warn: Input lines are too high for image and will be scaled to ${globalScale.toFixed(4)}x`)
  }
  let y = Math.floor((height - totalHeight * globalScale) / 2)
  /** @type { import('sharp').OverlayOptions[] } */
  const composites = []
  for (const conf of toDraws) {
    if (conf.scale !== 1 || globalScale !== 1) {
      const resizeWidth = Math.floor(conf.realWidth * globalScale)
      const resizeHeight = Math.floor(conf.realHeight * globalScale)
      composites.push({
        input: await sharp(Buffer.from(conf.svg)).resize(resizeWidth, resizeHeight).png().toBuffer(),
        left: Math.floor((width - conf.realWidth * globalScale) / 2),
        top: y
      })
    } else {
      composites.push({
        input: Buffer.from(conf.svg),
        left: Math.floor((width - conf.realWidth) / 2),
        top: y
      })
    }
    y += Math.floor(lineSpace * globalScale + conf.realHeight * globalScale)
  }
  return bg.composite(composites)
}

/**
 * @typedef TextConfig
 * @property { string } color 文字颜色
 * @property { number } fontSize 文字大小
 * @property { string } strokeColor 描边颜色
 * @property { number } strokeSize 描边大小
 *
 * @typedef TextOption
 * @property { string } text 文本内容
 * @property { string } [color] 文字颜色
 * @property { number } [fontSize] 文字大小
 * @property { string } [strokeColor] 描边颜色
 * @property { number } [strokeSize] 描边大小
 */

const textToLines = (text = '', max = 16) => {
  /** @type { string[] } */
  const lines = []
  let line = '', ctr = 0
  const addLine = () => {
    lines.push(line.trim())
    line = ''
    ctr = 0
  }
  for (const char of text) {
    if (char === '\n') {
      addLine()
      continue
    }
    line += char
    if (char.charCodeAt(0) < 256) {
      ctr += 1
    } else {
      ctr += 2
    }
    if (ctr >= max) addLine()
  }
  addLine() // This may add empty line
  const result = lines.filter(l => l)
  // Consider text with '\n' as pre-formatted
  if (text.includes('\n')) return result
  // If last line contains fewer chars, add 2 chars from previous line
  const last = result[result.length - 1]
  const last2 = result[result.length - 2]
  if (last.length < 3 && last2 && last2.length > 5) {
    result[result.length -1] = last2.substring(last2.length - 2) + last
    result[result.length - 2] = last2.substring(0, last2.length - 2)
  }
  return result
}

/**
 * @function parseTextOption
 * @param { string|Array<string|TextOption> } textOrTexts
 * @param { TextConfig } [defaultConfig]
 * @returns { SvgOption[] }
 */
const parseTextOption = (textOrTexts, defaultConfig = {
  color: 'red',
  strokeColor: '#fcf88d',
  strokeSize: 12,
  fontSize: 108
}) => {
  /** @type { SvgOption[] } */
  const opts = typeof textOrTexts === 'string'
    ? textToLines(textOrTexts).map(text => ({ text }))
    : textOrTexts.map(textlike => {
      if (typeof textlike === 'string') {
        return { text: textlike }
      } else {
        return textlike
      }
    })
  return opts.map(conf => {
    return Object.assign({
      color: 'red',
      strokeColor: '#fcf88d',
      strokeSize: 12,
      fontSize: 108
    }, defaultConfig, conf)
  })
}

/**
 * @function custom
 * @description 自定义合成图片
 * @param { object } options
 * @param { object } options.background 背景设置
 * @param { string } options.background.path 背景图片路径
 * @param { number } options.background.width 背景图片宽度
 * @param { number } options.background.height 背景图片高度
 * @param { string|string[]|TextOption[] } options.textOrTexts 文本内容
 * @param { TextConfig } options.defaultConfig 默认配置
 * @param { number } [options.lineSpace] 文本行间距
 */
const custom = ({
  background, textOrTexts, defaultConfig,
  lineSpace = 16
}) => {
  return generateImage(
    background.path,
    { width: background.width, height: background.height },
    parseTextOption(textOrTexts, defaultConfig).map(conf => textSvg(conf)),
    lineSpace
  )
}

/**
 * @function xibao
 * @description 合成喜报
 * @param { string|string[]|TextOption[] } textOrTexts
 */
const xibao = (textOrTexts) => {
  return custom({
    background: {
      path: resolve(__dirname, 'assets/xibao.webp'),
      width: xibaoSize.width,
      height: xibaoSize.height
    },
    textOrTexts,
    defaultConfig: {
      color: 'red',
      strokeColor: '#fcf88d',
      strokeSize: 12,
      fontSize: 108
    },
    lineSpace: 16
  })
}
/**
 * @function beibao
 * @description 合成悲报
 * @param { string|string[]|TextOption[] } textOrTexts
 */
const beibao = (textOrTexts) => {
  return custom({
    background: {
      path: resolve(__dirname, 'assets/beibao.webp'),
      width: beibaoSize.width,
      height: beibaoSize.height
    },
    textOrTexts,
    defaultConfig: {
      color: '#2d2d2d',
      strokeColor: 'white',
      strokeSize: 12,
      fontSize: 108
    },
    lineSpace: 16
  })
}

/**
 * @function setFont
 * @description 设置字体
 * @param { string } fontpath 字体文件路径
 */
const setFont = fontpath => {
  t2sConfig.fontfile = fontpath
}

module.exports = {
  xibao,
  beibao,
  custom,
  setFont
}
