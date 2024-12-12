# AccessToken

这是一个获取常见AccessToken的API服务

## 使用

```bash
npm install
npm run dev
```

## 入参出参说明

返回值一定是 JSON，正常就是 HTTP 200，错误就是 HTTP 非200。

正常返回的是 data，里面装的就是原始数据，三方返回什么，就返回什么。

错误返回的是 error，里面装的就是错误信息，没有错误码，只有错误信息。

### 微信小程序

#### 入参

- appId
- appSecret

#### 出参

- access_token
- expires_in
