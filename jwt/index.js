"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  encode: true,
  decode: true,
  getToken: true
};
exports.decode = decode;
exports.encode = encode;
exports.getToken = getToken;

var _jose = require("jose");

var _hkdf = _interopRequireDefault(require("@panva/hkdf"));

var _uuid = require("uuid");

var _cookie = require("../core/lib/cookie");

var _types = require("./types");

Object.keys(_types).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _types[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _types[key];
    }
  });
});
const DEFAULT_MAX_AGE = 30 * 24 * 60 * 60;

const now = () => Date.now() / 1000 | 0;

async function encode({
  token = {},
  secret,
  maxAge = DEFAULT_MAX_AGE
}) {
  const encryptionSecret = await getDerivedEncryptionKey(secret);
  return await new _jose.EncryptJWT(token).setProtectedHeader({
    alg: "dir",
    enc: "A256GCM"
  }).setIssuedAt().setExpirationTime(now() + maxAge).setJti((0, _uuid.v4)()).encrypt(encryptionSecret);
}

async function decode({
  token,
  secret
}) {
  if (!token) return null;
  const encryptionSecret = await getDerivedEncryptionKey(secret);
  const {
    payload
  } = await (0, _jose.jwtDecrypt)(token, encryptionSecret, {
    clockTolerance: 15
  });
  return payload;
}

async function getToken(params) {
  var _process$env$NEXTAUTH, _process$env$NEXTAUTH2, _req$headers$authoriz;

  const {
    req,
    secureCookie = (_process$env$NEXTAUTH = (_process$env$NEXTAUTH2 = process.env.NEXTAUTH_URL) === null || _process$env$NEXTAUTH2 === void 0 ? void 0 : _process$env$NEXTAUTH2.startsWith("https://")) !== null && _process$env$NEXTAUTH !== void 0 ? _process$env$NEXTAUTH : !!process.env.VERCEL_URL,
    cookieName = secureCookie ? "__Secure-next-auth.session-token" : "next-auth.session-token",
    raw,
    decode: _decode = decode,
    logger = console
  } = params !== null && params !== void 0 ? params : {};
  if (!req) throw new Error("Must pass `req` to JWT getToken()");
  const sessionStore = new _cookie.SessionStore({
    name: cookieName,
    options: {
      secure: secureCookie
    }
  }, {
    cookies: req.cookies,
    headers: req.headers
  }, logger);
  let token = sessionStore.value;

  if (!token && ((_req$headers$authoriz = req.headers.authorization) === null || _req$headers$authoriz === void 0 ? void 0 : _req$headers$authoriz.split(" ")[0]) === "Bearer") {
    const urlEncodedToken = req.headers.authorization.split(" ")[1];
    token = decodeURIComponent(urlEncodedToken);
  }

  if (!token) return null;
  if (raw) return token;

  try {
    return await _decode({
      token,
      ...params
    });
  } catch (_unused) {
    return null;
  }
}

async function getDerivedEncryptionKey(secret) {
  return await (0, _hkdf.default)("sha256", secret, "", "NextAuth.js Generated Encryption Key", 32);
}