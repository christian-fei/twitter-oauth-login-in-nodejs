const connect = require('connect')
const querystring = require('querystring')
const session = require('express-session')
const cookieParser = require('cookie-parser')

const {
  getOAuthRequestToken,
  getOAuthAccessTokenWith,
  oauthGetUserById
} = require('./oauth-utilities')

const path = require('path')
const fs = require('fs')

const INDEX = fs.readFileSync(path.resolve(__dirname, 'client', 'index.html'), { encoding: 'utf8' })
const TEMPLATE = fs.readFileSync(path.resolve(__dirname, 'client', 'template.html'), { encoding: 'utf8' })

const COOKIE_SECRET = process.env.npm_config_cookie_secret || process.env.COOKIE_SECRET

main()
  .catch(err => console.error(err.message, err))

async function main () {
  const app = connect()
  app.use(cookieParser())
  app.use(session({ secret: COOKIE_SECRET || 'secret', secure: false }))

  app.listen(3000, () => console.log('listening on http://127.0.0.1:3000'))

  app.use((req, res, next) => {
    console.log('/ req.cookies', req.cookies)

    if (req.url === '/') {
      if (req.cookies && req.cookies.twitter_screen_name) {
        console.log('/ authorized', req.cookies.twitter_screen_name)
        return res.end(TEMPLATE.replace('CONTENT', `
          <h1>Hello ${req.cookies.twitter_screen_name}</h1>
          <br>
          <a href="/twitter/logout">logout</a>
        `))
      }

      res.end(INDEX)
    }

    if (req.url === '/twitter/logout') {
      req.cookies.twitter_screen_name = null
      req.session.cookie.twitter_screen_name = null
      return req.session.destroy(() => {
        res.statusCode = 301
        res.setHeader('Set-Cookie', ['twitter_screen_name=; Path=/;'])
        res.setHeader('Location', '/')
        res.end()
      })
    }
    if (req.url === '/twitter/authenticate') return twitter('authenticate')(req, res)
    if (req.url === '/twitter/authorize') return twitter('authorize')(req, res)
    if (req.url.startsWith('/twitter/callback')) return handleTwitterCallback(req, res)

    console.log('unhandled req.url', req.url)

    next()
  })
  function twitter (method = 'authorize') {
    return async (req, res) => {
      console.log(`/twitter/${method}`)
      const { oauthRequestToken, oauthRequestTokenSecret } = await getOAuthRequestToken()
      console.log(`/twitter/${method} ->`, { oauthRequestToken, oauthRequestTokenSecret })

      req.session.oauthRequestToken = oauthRequestToken
      req.session.oauthRequestTokenSecret = oauthRequestTokenSecret

      const authorizationUrl = `https://api.twitter.com/oauth/${method}?oauth_token=${oauthRequestToken}`
      console.log('redirecting user to ', authorizationUrl)
      res.statusCode = 301
      res.setHeader('Location', authorizationUrl)
      res.end()
    }
  }
  function handleTwitterCallback (req, res) {
    const { oauthRequestToken, oauthRequestTokenSecret } = req.session
    const { oauth_verifier: oauthVerifier } = querystring.parse(req.url.substring('/twitter/callback?'.length)) || {}
    console.log('/twitter/callback', { oauthRequestToken, oauthRequestTokenSecret, oauthVerifier })

    return getOAuthAccessTokenWith({ oauthRequestToken, oauthRequestTokenSecret, oauthVerifier })
      .then(async ({ oauthAccessToken, oauthAccessTokenSecret, results }) => {
        req.session.oauthAccessToken = oauthAccessToken

        const { user_id: userId /*, screen_name */ } = results
        const user = await oauthGetUserById(userId, { oauthAccessToken, oauthAccessTokenSecret })

        req.session.twitter_screen_name = user.screen_name

        console.log('user succesfully logged in with twitter', user.screen_name)
        req.session.save(() => {
          res.statusCode = 301
          res.setHeader('Location', '/')
          res.setHeader('Set-Cookie', [`twitter_screen_name=${user.screen_name}; Path=/;`])
          res.end()
        })
      })
  }
}
