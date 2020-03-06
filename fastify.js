const fastify = require('fastify')
const fastifySession = require('fastify-session')
const fastifyCookie = require('fastify-cookie')

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
  const app = fastify({ logger: true })

  app.register(fastifyCookie)
  app.register(fastifySession, {
    cookieName: 'sessionId',
    secret: COOKIE_SECRET || 'secretsecretsecretsecretsecretsecretsecret',
    cookie: { secure: false },
    expires: 900000
  })

  app.addHook('preHandler', (request, reply, next) => {
    next()
  })

  app.get('/', {
    handler (request, reply) {
      reply.type('text/html')

      console.log('/ request.cookies', request.cookies)
      if (request.cookies && request.cookies.twitter_screen_name) {
        console.log('/ authorized', request.cookies.twitter_screen_name)
        return reply.send(TEMPLATE.replace('CONTENT', `
          <h1>Hello ${request.cookies.twitter_screen_name}</h1>
          <br>
          <a href="/twitter/logout">logout</a>
        `))
      }

      reply.send(INDEX)
    }
  })
  app.get('/twitter/logout', logout)
  function logout (request, reply) {
    reply.clearCookie('twitter_screen_name', { path: '/' })
    reply.redirect('/')
  }
  app.get('/twitter/authenticate', twitter('authenticate'))
  app.get('/twitter/authorize', twitter('authorize'))
  function twitter (method = 'authorize') {
    return async (request, reply) => {
      console.log(`/twitter/${method}`)
      const { oauthRequestToken, oauthRequestTokenSecret } = await getOAuthRequestToken()
      console.log(`/twitter/${method} ->`, { oauthRequestToken, oauthRequestTokenSecret })

      request.session.oauthRequestToken = oauthRequestToken
      request.session.oauthRequestTokenSecret = oauthRequestTokenSecret

      const authorizationUrl = `https://api.twitter.com/oauth/${method}?oauth_token=${oauthRequestToken}`
      console.log('redirecting user to ', authorizationUrl)
      reply.redirect(authorizationUrl)
    }
  }
  app.get('/twitter/callback', async (request, reply) => {
    const { oauthRequestToken, oauthRequestTokenSecret } = request.session
    console.log('request.session', { oauthRequestToken, oauthRequestTokenSecret })
    console.log('request.query', request.query)
    const { oauth_verifier: oauthVerifier } = request.query
    console.log('/twitter/callback', { oauthRequestToken, oauthRequestTokenSecret, oauthVerifier })

    const { oauthAccessToken, oauthAccessTokenSecret, results } = await getOAuthAccessTokenWith({ oauthRequestToken, oauthRequestTokenSecret, oauthVerifier })
    request.session.oauthAccessToken = oauthAccessToken

    const { user_id: userId /*, screen_name */ } = results
    const user = await oauthGetUserById(userId, { oauthAccessToken, oauthAccessTokenSecret })

    request.session.twitter_screen_name = user.screen_name
    reply
      .setCookie('twitter_screen_name', user.screen_name, {
        domain: '127.0.0.1',
        path: '/',
        secure: false
      })

    console.log('user succesfully logged in with twitter', user.screen_name)
    reply.redirect('/')
  })

  try {
    await app.listen(3000)
    app.log.info(`server listening on ${app.server.address().port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}
