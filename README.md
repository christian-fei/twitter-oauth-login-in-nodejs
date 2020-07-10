# twitter-oauth-login-in-nodejs

💣 **Full tutorial can be found on [cri.dev](https://cri.dev/posts/2020-03-05-Twitter-OAuth-Login-by-example-with-Node.js/)!** 🚀

---

Create an app on [developer.twitter.com](https://developer.twitter.com/en/apps) and get the following key and tokens:

- `TWITTER_CONSUMER_API_KEY`
- `TWITTER_CONSUMER_API_SECRET`

and run in your cloned local repository (to clone the repo: `git clone git@github.com:christian-fei/twitter-oauth-login-in-nodejs.git`):

```
TWITTER_CONSUMER_API_KEY=[YOUR_TWITTER_CONSUMER_KEY] TWITTER_CONSUMER_API_SECRET=[YOUR_TWITTER_CONSUMER_SECRET] npm start
```

or alternatively set them in a local `.npmrc` file like this:

```
twitter_consumer_api_key=xxx
twitter_consumer_api_secret_key=xxx
```

and then run `npm start`

---

visit [http://127.0.0.1:3000/](http://127.0.0.1:3000/)

## fastify version

to run the **fastify** example, run `npm run fastify`.

## connect version

to run the **connect** example, run `npm run connect`.
