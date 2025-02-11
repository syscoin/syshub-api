/* eslint-disable no-useless-catch */
const strToHex = (str) => {
  try {
    const strParse = JSON.stringify(str)
    let hex = ''
    let i = 0
    const strLen = strParse.length
    let c = ''

    for (; i < strLen; i += 1) {
      c = strParse.charCodeAt(i)
      hex += c.toString(16)
    }
    return hex
  } catch (err) {
    throw err
  }
}

const hexToStr = (hex) => {
  try {
    let str = ''
    let i = 0
    const arrLen = hex.length / 2
    let c = ''

    for (; i < arrLen; i += 1) {
      const chunk = hex.slice(2 * i, 2 * i + 2)
      c = String.fromCharCode(parseInt(chunk, 16))
      str += c
    }
    return str
  } catch (err) {
    throw err
  }
}

module.exports = {
  strToHex,
  hexToStr,
}
