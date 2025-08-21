# SSO PNJ Demo (NodeJS, ExpressJS)

Repositori ini merupakan contoh penggunaan service *Single Sign-On* Politeknik Negeri Jakarta untuk aplikasi web berbasis NodeJS.

#### Requirement

* NodeJS versi **22.x LTS** direkomendasikan (minimal **20.x**).

* Pastikan client Anda di SSO PNJ telah terdaftar menggunakan metode autentikasi 'client_secret_basic'.

Untuk mendaftarkan aplikasi Anda, silahkan buat tiket di <https://layanan.pnj.ac.id/>

### Konfigurasi Keycloak (dev-sso.upatik.io)

Project ini telah dikonfigurasi untuk menggunakan Keycloak pada realm `dev-sso` di `https://dev-sso.upatik.io` melalui OpenID Connect.

1. Salin berkas contoh environment: `cp .env.example .env`

2. Isi variabel berikut di `.env` sesuai client Anda di Keycloak:

   * `OIDC_CLIENT_ID`

   * `OIDC_CLIENT_SECRET` (jika confidential client)

   * Opsional: `OIDC_REDIRECT_URI` (default `http://localhost:3000/cb`)

   * Opsional: `OIDC_POST_LOGOUT_REDIRECT_URI` (default `http://localhost:3000/`)

3. Pastikan `Valid Redirect URIs` pada client di Keycloak mencakup `http://localhost:3000/cb` saat pengembangan.

4. Jalankan aplikasi (lihat bagian Menjalankan project example ini).

Alur login menggunakan Authorization Code + PKCE. Logout akan mengarahkan ke endpoint `end_session` Keycloak dan kembali ke `OIDC_POST_LOGOUT_REDIRECT_URI`.

#### Instalasi package

Kami menggunakan `node-openid-client` untuk implementasi pada repositori ini, install dengan :

```
npm install openid-client
```

### Quick Start

Anda dapat secara otomatis mendapatkan konfigurasi OpenID dari endpoint `.well-known` yang dimiliki oleh SSO PNJ dan membuat instance client.

```javascript
const client = require('openid-client');

const issuerBaseUrl = new URL(process.env.OIDC_ISSUER);
const clientId = process.env.OIDC_CLIENT_ID;
const clientSecret = process.env.OIDC_CLIENT_SECRET;

async function getSSOClient() {
  // Secara otomatis menemukan konfigurasi dari issuer base URL
  return client.discovery(
    issuerBaseUrl,
    clientId,
    clientSecret,
  );
}
```

Untuk menghasilkan URL yang akan me-redirect user ke halaman login SSO PNJ, gunakan alur **Authorization Code + PKCE**.

```javascript
// Di dalam route login Anda
const ssoClient = await getSSOClient();

// 1. Generate code verifier dan code challenge untuk PKCE
const codeVerifier = client.randomPKCECodeVerifier();
const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);

// 2. Generate state untuk proteksi CSRF
const state = client.randomState();

// 3. Simpan verifier dan state di dalam session untuk diverifikasi nanti
req.session.pkce_verifier = codeVerifier;
req.session.oauth_state = state;

const parameters = {
  redirect_uri: new URL('http://localhost:3000/cb'), // Sesuaikan dengan OIDC_REDIRECT_URI
  scope: 'openid profile email',
  code_challenge: codeChallenge,
  code_challenge_method: 'S256',
  state: state,
};

// 4. Buat URL otorisasi dan redirect user
const redirectTo = client.buildAuthorizationUrl(ssoClient, parameters);
res.redirect(redirectTo);
```

Saat user dialihkan kembali ke `redirect_uri` (`/cb`), tukarkan `authorization_code` dengan `tokenSet`.

```javascript
// Di dalam route callback Anda
const ssoClient = await getSSOClient();
const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

// Verifikasi state dan PKCE code verifier yang sebelumnya disimpan di session
const tokenSet = await client.authorizationCodeGrant(
  ssoClient,
  new URL(fullUrl),
  {
    pkceCodeVerifier: req.session.pkce_verifier,
    expectedState: req.session.oauth_state,
  },
);

// Simpan tokenSet dan claims ke dalam session
req.session.token_set = tokenSet;
req.session.id_token_claim = tokenSet.claims();
```

Untuk mengambil informasi user dari endpoint `userinfo`, gunakan `access_token` dari `tokenSet`.

```javascript
const tokenSet = req.session.token_set;
const idTokenClaim = req.session.id_token_claim;

if (!tokenSet) {
  return res.status(401).json({ error: 'Not authenticated' });
}

const ssoClient = await getSSOClient();

// Ambil informasi user
const userinfo = await client.fetchUserInfo(ssoClient, tokenSet.access_token, idTokenClaim);

// Tampilkan userinfo ke dalam json
res.json(userinfo);
```

### OpenID Payload

Berikut merupakan contoh objek user yang akan diterima ketika parsing `id_token`

```json
{
  "sub": "08e4feee-42c9-41c6-8edf-e8a8d3491ca7",
  "email_verified": false,
  "role": [
    "Mahasiswa",
    "default-roles-dev-sso",
    "offline_access",
    "uma_authorization"
  ],
  "name": "Fiaxxxxx Ichsxxx Syaxxxxx",
  "preferred_username": "245122xxxxx",
  "dept": [
    "/Mahasiswa",
    "/Mahasiswa/Teknik Informatika dan Komputer"
  ],
  "given_name": "Fiaxxxxx",
  "locale": "id",
  "family_name": "Ichsxxx Syaxxxx",
  "email": "fiaxxxxx@stu.pnj.ac.id"
}
```

Untuk menyimpan atau mencocokkan user ke dalam database internal Anda, kami sarankan gunakan value dari `preferred_username`

## Lebih lanjut

Untuk informasi implementasi lebih lanjut tentang OpenID didalam NodeJS silahkan membaca dokumentasi dari package `openid-client`

<https://github.com/panva/node-openid-client>

### Menjalankan project example ini

1. Gunakan Node 22 LTS (contoh dengan nvm): `nvm install 22 && nvm use 22`

2. `npm install`

3. Dev server: `npm run dev`

4. Production: `npm start`

### Report SSO PNJ Bug

Jika Anda menemukan bug, silakan kirim email ke `farhan.hanif@pnj.ac.id`. Untuk respons yang lebih cepat dan terorganisir, kami sangat menyarankan untuk membuat 'issue' baru di repositori ini.
