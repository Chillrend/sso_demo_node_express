const express = require('express');
const router = express.Router();
const { Issuer } = require('openid-client');
const { generators } = require('openid-client');

async function getSSOClient(){
  const ssoPnj = await Issuer.discover('https://test.madjavacoder.me:4444');
  return new ssoPnj.Client({
    client_id: 'adeb55f0-91aa-4e94-9faf-5978533c09f7',
    client_secret: 'pDAT9Y1XUQewSxRNzY.n1hbvq9',
    redirect_uris: ['http://localhost:3000/cb'],
    response_types: ['code']
  });
}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/login', async function(req, res, next) {
  res.render('auth/login', { title: 'Login - App'});
})

router.get('/login/auth/pnj', async function(req, res, next) {
  const client = await getSSOClient();

  const state = generators.state(32);

  //save the state into session/cookies/or any somewhat secure state storage
  req.session.oauth_state = state;

  const url = client.authorizationUrl({
    scope: 'openid',
    redirect_uri: ['http://localhost:3000/cb'],
    state: state,
    code_challenge_method: 'S256',
    response_type: ['code']
  })

  res.redirect(url);
})


router.get('/cb', async function(req, res, next) {
  const client = await getSSOClient();
  const params = client.callbackParams(req);

  const tokenSet = await client.callback('http://localhost:3000/cb', params, {state: req.session.oauth_state});

  //Store this in your database if you need to refresh the token later
  req.session.token_set = tokenSet;

  res.render('auth/success', { title: 'Success!', tokenSet: tokenSet});
})

router.get('/userinfo', async function (req, res, next) {
  const client = await getSSOClient();

  const userinfo = await client.userinfo(req.session.token_set.access_token);

  res.json(userinfo);
})

module.exports = router;
