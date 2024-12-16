import express from 'express'
import axios from 'axios'
import fs from 'fs'
import crypto from 'crypto'
import xml2js from 'xml2js'

const router = express.Router()

/**
 * 获取微信公众号接口调用凭据(access_token)，官方文档 https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/mp-access-token/getAccessToken.html
 * @param {Object} req - Express请求对象
 * @param {Object} req.query - 请求参数对象
 * @param {string} req.query.appId - 微信公众号的AppID
 * @param {string} req.query.appSecret - 微信公众号的AppSecret
 * @param {Object} res - Express响应对象
 * @returns {{data: {access_token: string, expires_in: number}}} 包含access_token的响应数据
 * @throws {Object} 400 - 缺少必需的appId或appSecret参数时返回错误
 */
async function onGetWxMpAccessToken({ appId, appSecret }) {
  const url = `https://api.weixin.qq.com/cgi-bin/token?appid=${appId}&secret=${appSecret}&grant_type=client_credential`
  try {
    const { data } = await axios.get(url)
    return data
  } catch (error) {
    throw new Error(error.message)
  }
}
router.get('/mp', async (req, res) => {
  const { appId, appSecret } = req.query
  if (!appId || !appSecret) {
    return res.status(400).json({ error: 'appId and appSecret are required' })
  }
  try {
    const data = await onGetWxMpAccessToken({ appId, appSecret })
    res.json({ data })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

/**
 * 获取微信小程序用户openid，官方文档 https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/user-login/code2Session.html
 * @param {Object} req - Express请求对象
 * @param {Object} req.query - 请求参数对象
 * @param {string} req.query.appId - 微信小程序的AppID
 * @param {string} req.query.appSecret - 微信小程序的AppSecret
 * @param {string} req.query.code - 微信小程序登录时获取的code
 * @param {Object} res - Express响应对象
 * @returns {{data: {openid: string, session_key: string}}} 包含openid和session_key的响应数据
 * @throws {Object} 400 - 缺少必需的appId、appSecret或code参数时返回错误
 */
async function onGetWxMpOpenId({ appId, appSecret, code }) {
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`
  try {
    const { data } = await axios.get(url)
    return data
  } catch (error) {
    throw new Error(error.message)
  }
}
router.get('/openid', async (req, res) => {
  const { appId, appSecret, code } = req.query
  if (!appId || !appSecret || !code) {
    return res.status(400).json({ error: 'appId and appSecret and code are required' })
  }
  try {
    const data = await onGetWxMpOpenId({ appId, appSecret, code })
    res.json({ data })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

/**
 * 获取微信小程序二维码，官方文档 https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/qrcode-link/qr-code/getUnlimitedQRCode.html
 * @param {Object} req - Express请求对象
 * @param {Object} req.query - 请求参数对象
 * @param {string} req.query.appId - 微信小程序的AppID
 * @param {string} req.query.appSecret - 微信小程序的AppSecret
 * @param {string} req.query.page - 微信小程序的页面路径
 * @param {string} req.query.scene - 微信小程序的场景值
 * @param {string} [req.query.env_version] - 要打开的小程序版本。正式版为 "release"，体验版为 "trial"，开发版为 "develop"。默认是正式版。
 * @param {Object} res - Express响应对象
 * @returns {{data: {url: string}}} 返回二维码图片的Buffer
 * @throws {Object} 400 - 缺少必需的appId、appSecret、page或scene参数时返回错误
 */
async function onPostWxMpACode({ appId, appSecret, page, scene, env_version = 'release' }) {
  try {
    let data = await onGetWxMpAccessToken({ appId, appSecret })
    const ret = await axios.post(
      `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${data.access_token}`,
      {
        scene,
        page,
        env_version
      },
      { responseType: 'arraybuffer' }
    )
    const errorBufferString = ret.data.toString()
    if (errorBufferString.includes('errcode')) {
      return JSON.parse(errorBufferString)
    }
    fs.mkdirSync('public/images', { recursive: true })
    fs.writeFileSync('public/images/buffer.png', ret.data)
    return { data: { url: '/images/buffer.png' } }
  } catch (error) {
    throw new Error(error.message)
  }
}
router.post('/acode', async (req, res) => {
  const { appId, appSecret, page, scene, env_version = 'release' } = req.body
  if (!appId || !appSecret || !page) {
    return res.status(400).json({ error: 'appId and appSecret and page are required' })
  }
  try {
    const data = await onPostWxMpACode({ appId, appSecret, page, scene, env_version })
    res.json({ data })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

/**
 * 调用微信支付V2版本统一下单接口，官方文档 https://pay.weixin.qq.com/doc/v2/merchant/4011940985
 * @param {Object} orderInfo - 订单信息对象
 * @param {string} orderInfo.appId - 微信支付分配的公众账号ID
 * @param {string} orderInfo.mchId - 微信支付分配的商户号
 * @param {string} orderInfo.nonceString - 随机字符串
 * @param {string} orderInfo.body - 商品描述
 * @param {string} orderInfo.outTradeNo - 商户系统内部订单号
 * @param {number} orderInfo.totalFee - 订单总金额，单位为分
 * @param {string} orderInfo.notifyUrl - 接收微信支付异步通知回调地址
 * @param {string} [orderInfo.openId] - 接收微信支付异步通知回调地址
 * @param {string} [orderInfo.tradeType=JSAPI] - 交易类型,取值如下：JSAPI,NATIVE,APP，这里是小程序，默认JSAPI
 * @returns {Promise<Object>} 微信支付统一下单接口返回的数据
 * @throws {Error} 请求失败时抛出错误
 */

async function onPostWxPayV2(apiKey, orderInfo) {
  const { appId, mchId, nonceString, body, attach, outTradeNo, totalFee, notifyUrl, openId, tradeType = 'JSAPI' } = orderInfo
  const wxOrderInfo = {
    appid: appId,
    mch_id: mchId,
    nonce_str: nonceString,
    body,
    attach,
    out_trade_no: outTradeNo,
    total_fee: totalFee,
    notify_url: notifyUrl,
    openid: openId,
    trade_type: tradeType
  }
  let keys = Object.keys(wxOrderInfo)
  keys.sort()
  const signString =
    keys.reduce((acc, key) => {
      acc += `${key}=${wxOrderInfo[key]}&`
      return acc
    }, '') +
    'key=' +
    apiKey
  const hash = crypto.createHash('md5')
  const sign = hash.update(signString).digest('hex')
  wxOrderInfo.sign = sign
  const xml = new xml2js.Builder().buildObject(wxOrderInfo)
  const { data } = await axios.post('https://api.mch.weixin.qq.com/pay/unifiedorder', xml, {
    headers: {
      'Content-Type': 'application/xml'
    }
  })
  const result = await xml2js.parseStringPromise(data)
  const timeStamp = Date.now() + ''
  const prepayId = result.xml['prepay_id'][0]
  const paySign = crypto
    .createHash('md5')
    .update(`appId=${appId}&nonceStr=${nonceString}&package=prepay_id=${prepayId}&signType=MD5&timeStamp=${timeStamp}&key=${apiKey}`)
    .digest('hex')

  return {
    appId,
    timeStamp,
    nonceStr: nonceString,
    package: `prepay_id=${prepayId}`,
    signType: 'MD5',
    paySign
  }
}
router.post('/pay/v2', async (req, res) => {
  const { appId, appSecret, mchId, openId, notifyUrl, apiKey } = req.body
  if (!appId || !appSecret || !mchId || !apiKey) {
    return res.status(400).json({
      error: 'appId and appSecret and mchId and apiKey are required'
    })
  }
  const nonceString = crypto.randomBytes(16).toString('hex')
  const body = '测试商品'
  const attach = JSON.stringify({
    name: '测试商品',
    price: 1,
    quantity: 1,
    id: 123
  })
  const outTradeNo = crypto.randomBytes(16).toString('hex') // mock
  const totalFee = 1
  try {
    const data = await onPostWxPayV2(apiKey, {
      appId,
      mchId,
      nonceString,
      body,
      attach,
      outTradeNo,
      totalFee,
      notifyUrl,
      openId
    })
    res.json({ data })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

/**
 * 处理微信支付V2版本的支付结果通知，官方文档 https://pay.weixin.qq.com/wiki/doc/api/jsapi.php?chapter=9_7
 * @param {string} xml - 微信支付通知的XML格式数据
 * @returns {Promise<{data: Object}>} 包含解析后的支付结果数据
 * @throws {Error} 解析XML数据失败时抛出错误
 */
async function onWxPayV2Notify(xml) {
  // Custom here
  return { data: xml }
}
router.post('/pay/v2/notify', async (req, res) => {
  console.log(req.headers['content-type'])

  if (!req.is('text/xml') && !req.is('application/xml')) {
    return res.send(req.header || req.headers)
  }
  let xml = ''
  await new Promise((s) => {
    req.setEncoding('utf8')
    req.on('data', (chunk) => (xml += chunk))
    req.on('end', () => {
      s(xml)
    })
  })
  console.log(xml)
  const data = await onWxPayV2Notify(xml)
  res.send(data)
})

export default router
