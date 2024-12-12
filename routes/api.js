// @ts-check
import express from 'express'
import axios from 'axios'

const router = express.Router()

/* GET home page. */
router.get('/', function (req, res) {
  res.render('index', { title: 'AccessToken' })
})

/**
 * 获取微信公众号接口调用凭据(access_token)
 * @route GET /api/wx/mp
 * @param {Object} req - Express请求对象
 * @param {Object} req.query - 请求参数对象
 * @param {string} req.query.appId - 微信公众号的AppID
 * @param {string} req.query.appSecret - 微信公众号的AppSecret
 * @param {Object} res - Express响应对象
 * @returns {Object} 包含access_token的响应数据
 * @throws {Object} 400 - 缺少必需的appId或appSecret参数时返回错误
 */
router.get('/wx/mp', async (req, res) => {
  const { appId, appSecret } = req.query
  if (!appId || !appSecret) {
    return res.status(400).json({ error: 'appId and appSecret are required' })
  }
  const url = `https://api.weixin.qq.com/cgi-bin/token?appid=${appId}&secret=${appSecret}&grant_type=client_credential`
  const { data } = await axios.get(url)
  res.json({ data })
})

export default router
