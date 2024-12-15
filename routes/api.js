import express from 'express'
import wx from './wx/wx.js'

const router = express.Router()

/* GET home page. */
router.get('/', function (req, res) {
  res.render('index', { title: 'AccessToken' })
})

router.use('/wx', wx)

export default router
