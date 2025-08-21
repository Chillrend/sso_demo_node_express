#  SSO PNJ Demo (NodeJS, ExpressJS)

Repositori ini merupakan contoh penggunaan service *Single Sign-On* Politeknik Negeri Jakarta untuk aplikasi web berbasis NodeJS.

#### Requirement

- NodeJS versi **22.x LTS** direkomendasikan (minimal **20.x**).
- Gunakan endpoint method `client_secret_basic` pada saat Anda mendaftarkan client didalam SSO PNJ

Untuk mendaftarkan aplikasi Anda, silahkan buat tiket di https://layanan.pnj.ac.id/
### Konfigurasi Keycloak (dev-sso.upatik.io)

Project ini telah dikonfigurasi untuk menggunakan Keycloak pada realm `dev-sso` di `https://dev-sso.upatik.io` melalui OpenID Connect.

1. Salin berkas contoh environment: `cp .env.example .env`
2. Isi variabel berikut di `.env` sesuai client Anda di Keycloak:
   - `OIDC_CLIENT_ID`
   - `OIDC_CLIENT_SECRET` (jika confidential client)
   - Opsional: `OIDC_REDIRECT_URI` (default `http://localhost:3000/cb`)
3. Pastikan `Valid Redirect URIs` pada client di Keycloak mencakup `http://localhost:3000/cb` saat pengembangan.
4. Jalankan aplikasi (lihat bagian Menjalankan project example ini).

Alur login menggunakan Authorization Code + PKCE. Logout akan mengarahkan ke endpoint `end_session` Keycloak dan kembali ke `OIDC_POST_LOGOUT_REDIRECT_URI`.

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
### OpenID Payload
Berikut merupakan contoh objek user yang akan diterima ketika parsing `id_token`
```json
{
  "address": "187 Justen Point Suite 090\nWest Shania, TX 99746-9546",
  "aud": [
    "a895f57b-561c-44b5-ab17-495272346318"
  ],
  "auth_time": 1622287922,
  "date_of_birth": "1979-03-14",
  "department_and_level": [
    {
      "access_level": 99,
      "access_level_name": "Admin",
      "department": "Teknik Informatika dan Komputer",
      "department_short_name": "TIK"
    }
  ],
  "email": "wilkinson.marquise@example.com",
  "iat": 1622287930,
  "ident": 80779, //NIP/NIM, bergantung dengan akses level
  "iss": "http://localhost:4444/",
  "name": "Prof. Ivory Ferry",
  "rat": 1622287922,
  "sub": "4"
}
```
Untuk menyimpan atau mencocokkan user ke dalam database internal Anda, kami sarankan gunakan value dari `sub`, atau `ident`, karena value tersebut unique dalam setiap user.


## Lebih lanjut
Untuk informasi implementasi lebih lanjut tentang OpenID didalam NodeJS silahkan membaca dokumentasi dari package `openid-client`

https://github.com/panva/node-openid-client



### Menjalankan project example ini

1. Gunakan Node 22 LTS (contoh dengan nvm): `nvm install 22 && nvm use 22`
2. `npm install`
3. Dev server: `npm run dev`
4. Production: `npm start`



### Report SSO PNJ Bug

email developer di `farhan@pnj.ac.id` atau submit issues didalam repositori ini.
