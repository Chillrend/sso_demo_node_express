#  SSO PNJ Demo (NodeJS, ExpressJS)

Repositori ini merupakan contoh penggunaan service *Single Sign-On* Politeknik Negeri Jakarta untuk aplikasi web berbasis NodeJS.

#### Requirement

- NodeJS versi **12.0.0** direkomendasikan, namun minimal versi **10.19.0 (lts/dubnium)** dibutuhkan.

#### Instalasi package

Kami menggunakan `node-openid-client` untuk implementasi pada repositori ini, install dengan :

```bash
npm install openid-client
```

### Quick Start

Anda dapat secara otomatis mendapatkan konfigurasi openid otomatis dari endpoint `.well-known` yang dimiliki oleh sso pnj :

```javascript
const { Issuer } = require('openid-client');

// Atau gunakan promise: Issuer.discover().then(cb => {});
const ssoPnj = await Issuer.discover('https://sso.pnj.ac.id:4444');

// buat instance client dari hasil discover
const client = new ssoPnj.Client({
   	// Gunakan credential yang telah anda dapatkan dari SSO PNJ
    client_id: '000',
    client_secret: '000',
    // Callback uri harus dimasukkan didalam array
    redirect_uris: ['https://your-service.com/callback'],
    response_types: ['code']
});
```

Untuk menghasilkan url yang akan me*redirect* user kedalam sso pnj gunakan :

```javascript
const { generators } = require('openid-client');

// Generate 32bit encoded state
// Simpan variabel ini kedalam cookies/session/tempat penyimpanan lainnya
// yang relatif aman dari XSRF (ex: httpOnly cookies)
// variabel ini akan dicek kembali ketika akan menukar authorization_code
// ke tokenSet untuk menghindari MITM/XSRF.
const state = generators.state(32);

// contoh penyimpanan didalam expressjs
req.session.oauth_state = state;

// Dapatkan url
const url = client.authorizationUrl({
    scope: 'openid',
    redirect_uri: ['https://your-service.com/callback'],
    state: state,
    code_challenge_method: 'S256',
    response_type: ['code']
  });

// Lalu redirect user kepada url tersebut
// contoh redirect didalam expressjs
res.redirect(url);
```

Saat user dialihkan kembali ke `redirect_uri`, gunakan kode berikut untuk menukarkan `authorization_code` dengan `tokenSet`

```javascript
const params = client.callbackParams(req);

// State yang telah disimpan didalam cookies/sesssion tadi akan dicek disini
const tokenSet = await client.callback('https://your-service.com/callback', params, {state: req.session.oauth_state});

// Anda dapat menyimpan token ini kedalam persistent storage (ex: db) untuk dipakai kembali atau di refresh ketika sudah expired
// untuk project contoh ini, kita akan simpan didalam session saja.
req.session.token_set = tokenSet;
```

Untuk mengambil informasi openid user, gunakan kode berikut

```javascript
// Ambil access token dari storage
const userinfo = await client.userinfo(req.session.token_set.access_token);

// tampilkan userinfo ke dalam json
res.json(userinfo);
```

Untuk informasi implementasi lebih lanjut silaWhkan membaca dokumentasi dari package `openid-client`

https://github.com/panva/node-openid-client



### Menjalankan project example ini

1. `npm install`
2. `nodemon ./bin/www`



### Report SSO PNJ Bug

email developer di `farhan@madjavacoder.com` atau submit issues didalam repositori ini.