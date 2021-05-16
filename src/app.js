const express = require('express')
const jwt = require('jsonwebtoken')
const { isEmpty } = require('loadsh')
const { execSQL } = require('./db/mysql')

// 加密秘钥
const SECRET = 'secret'

const app = express()

// 解析application/x-www-form-urlencoded数据
app.use(express.urlencoded({ extended: true }))
// 解析application/json数据
app.use(express.json())

app.get('/api', (req, res) => {
  res.json({
    message: 'api'
  })
})

// 登陆
app.post('/api/login', (req, res) => {
  // userInfo示例：{ username: 'kyz', password: '123456'}
  const userInfo = req.body

  if (userInfo) {
    
    // 定义 sql 语句，user为表名
    const sqlR = `select password from user where username='${ userInfo.username }';`

    execSQL(sqlR).then(result => {
      // 如果数据库存在该用户
      if (!isEmpty(result)) {
        // 如果密码正确
        if (userInfo.password === result[0].password) {
          // 生成token
          // 第一位参数为加密数据，第二位参数为加密秘钥，是一个自定义的字符串, 第三位参数是一个配置对象，可以配置token生效时间
          const token = jwt.sign({
            username: userInfo.username,
            password: userInfo.password
          }, SECRET, {
            expiresIn: '1h'
          }, (err, token) => {
            if (err) {
              res.status(403).json('生成token失败')
            } else {
              // 返回token给前端, 使用json和send都可以,建议使用json，更全面
              res.json({
                code: 200,
                token,
                message: '生成token成功'
              })
              // res.send({
              //   code: 200,
              //   token,
              //   message: '生成token成功'
              // })
            }
          })
        } else {
          res.status(403).json('用户名或密码错误')
        }
      }else {
        res.status(403).json('用户名或密码错误')
      }
    }).catch(err => {
      console.log(err, '--err')
    })
  } else {
    res.status(403).json('需提供username和password')
  }
})

// 请求添加身份验证，只有验证成功才能进行请求
app.post('/api/verification', verifyTokenFunc, (req, res) => {
  res.json({
    token: req.token,
    message: '验证成功，请求被允许'
  })
})

// 身份验证
function verifyTokenFunc(req, res, next) {
  // bearerHeader示例： 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Imt5eiIsInBhc3N3b3JkIjoiMTIzNDU2IiwiaWF0IjoxNjIxMTU2MDYwfQ.d9dXIC3LriTyC4FdzQezUfYSG99fWxA3MJCHjgSTIUM'
  const bearerHeader = req.headers['authorization']

  if (typeof bearerHeader !== 'undefined') {
    const bearer = bearerHeader.split(' ')
    const bearerToken = bearer[1]

    // 需要用加密时使用的秘钥进行验证
    // 此处只需要交给verify来验证就行，它会自己验证token是否正确，以及是否过期，不需要自己做额外的验证
    jwt.verify(bearerToken, SECRET, (err, authData) => {
      if (err) {
        res.status(403).json('token验证失败')
      } else {
        req.token = bearerToken
        next()
      }
    })
  } else {
    res.status(403).json('请求失败，请按照 Bearer **** 的规范在Headers中携带正确的Authorization：token参数')
  }
}

app.listen(5000, () => {
  console.log('server running at port 5000, http://localhost:5000')
})