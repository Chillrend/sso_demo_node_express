const express = require('express');
const client = require('openid-client');

const router = express.Router();

const redirectUri = new URL(process.env.OIDC_REDIRECT_URI) || new URL('http://localhost:3000/cb');
const issuerBaseUrl = new URL(process.env.OIDC_ISSUER) || new URL('https://dev-sso.upatik.io/realms/dev-sso');
const clientId = process.env.OIDC_CLIENT_ID;
const clientSecret = process.env.OIDC_CLIENT_SECRET;
const scopes = process.env.OIDC_SCOPES || 'openid profile email';

async function getSSOClient() {
  return client.discovery(
    issuerBaseUrl,
    clientId,
    clientSecret,
  );
}

/* GET home page. */
router.get('/', (req, res) => {
  res.render('index', { title: 'Express' });
});

router.get('/login', (req, res) => {
  res.render('auth/login', { title: 'Login - App' });
});

router.get('/login/auth/pnj', async (req, res, next) => {
  try {
    const ssoClient = await getSSOClient();

    const codeVerifier = client.randomPKCECodeVerifier();
    const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
    let state;

    const parameters = {
      redirect_uri: redirectUri,
      scope: scopes,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    };

    if (ssoClient.serverMetadata().supportsPKCE()) {
      state = client.randomState();
      parameters.state = state;
    }

    req.session.oauth_state = state;
    req.session.pkce_verifier = codeVerifier;

    const redirectTo = client.buildAuthorizationUrl(ssoClient, parameters);

    res.redirect(redirectTo);
  } catch (err) {
    next(err);
  }
});

router.get('/cb', async (req, res, next) => {
  try {
    const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const ssoClient = await getSSOClient();
    const tokenSet = await client.authorizationCodeGrant(
      ssoClient,
      new URL(fullUrl),
      {
        pkceCodeVerifier: req.session.pkce_verifier,
        expectedState: req.session.oauth_state,
      },
    );

    console.log(tokenSet);

    req.session.token_set = tokenSet;
    req.session.id_token_claim = tokenSet.claims();

    res.render('auth/success', { title: 'Success!', tokenSet });
  } catch (err) {
    next(err);
  }
});

router.get('/logout', async (req, res, next) => {
  try {
    const client = await getSSOClient();
    const endSessionUrl = client.issuer?.metadata?.end_session_endpoint;
    const idToken = req.session?.token_set?.id_token;
    const postLogoutRedirectUri = process.env.OIDC_POST_LOGOUT_REDIRECT_URI || 'http://localhost:3000/';

    req.session.destroy(() => {
      if (endSessionUrl && idToken) {
        const url = new URL(endSessionUrl);
        if (clientId) url.searchParams.set('client_id', clientId);
        url.searchParams.set('id_token_hint', idToken);
        url.searchParams.set('post_logout_redirect_uri', postLogoutRedirectUri);
        return res.redirect(url.toString());
      }
      return res.redirect('/');
    });
  } catch (err) {
    next(err);
  }
});

router.get('/userinfo', async (req, res, next) => {
  try {
    const tokenSet = req.session.token_set;
    const idTokenClaim = req.session.id_token_claim;
    if (!tokenSet) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const ssoClient = await getSSOClient();
    console.log(idTokenClaim);
    const userinfo = await client
      .fetchUserInfo(ssoClient, tokenSet.access_token, idTokenClaim.sub);
    console.log(userinfo);
    return res.json(userinfo);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
