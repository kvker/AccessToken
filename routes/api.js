import express from 'express'
import axios from 'axios'

const router = express.Router()

/* GET home page. */
router.get('/', function (req, res) {
  res.render('index', { title: 'AccessToken' })
})

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
async function onGetWxMpAccessToken(req, res) {
  const { appId, appSecret } = req.query
  if (!appId || !appSecret) {
    return res.status(400).json({ error: 'appId and appSecret are required' })
  }
  const url = `https://api.weixin.qq.com/cgi-bin/token?appid=${appId}&secret=${appSecret}&grant_type=client_credential`
  const { data } = await axios.get(url)
  res.json({ data })
}
router.get('/wx/mp', onGetWxMpAccessToken)

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
async function onGetWxMpOpenId(req, res) {
  const { appId, appSecret, code } = req.query
  if (!appId || !appSecret || !code) {
    return res.status(400).json({ error: 'appId and appSecret and code are required' })
  }
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`
  const { data } = await axios.get(url)
  res.json({ data })
}
router.get('/wx/openid', onGetWxMpOpenId)

/**
 * 获取微信小程序二维码，官方文档 https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/qrcode-link/qr-code/getUnlimitedQRCode.html
 * @param {Object} req - Express请求对象
 * @param {Object} req.query - 请求参数对象
 * @param {string} req.query.appId - 微信小程序的AppID
 * @param {string} req.query.appSecret - 微信小程序的AppSecret
 * @param {string} req.query.page - 微信小程序的页面路径
 * @param {string} req.query.scene - 微信小程序的场景值
 * @param {Object} res - Express响应对象
 * @returns {Buffer} 返回二维码图片的Buffer
 * @throws {Object} 400 - 缺少必需的appId、appSecret、page或scene参数时返回错误
 */
async function onGetWxMpACode(req, res) {
  const { appId, appSecret, page, scene } = req.query
  if (!appId || !appSecret || !page) {
    return res.status(400).json({ error: 'appId and appSecret and page are required' })
  }
  let { data } = await onGetWxMpAccessToken(req, res)
  const buffer = await axios.post(`https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${data.access_token}`, {
    scene,
    page
  })

  res.send(buffer)
}
router.get('/wx/acode', onGetWxMpACode)

export default router
