// backend/utils/angelOneClient.js
import { SmartAPI } from "smartapi-javascript";
import { authenticator } from "otplib";
import dotenv from "dotenv";
import fetch from "node-fetch";
dotenv.config();

/**
 * Thin wrapper around Angel One SmartAPI
 * - Uses TOTP login
 * - Exposes getLTP via REST (low-latency enough for periodic polling)
 * If you need streaming ticks, we can add WS + SSE later.
 */
class AngelOneClient {
  constructor() {
    // Read envs with backward-compatible fallbacks
    const getEnv = (...keys) => keys.map((k) => process.env[k]).find((v) => v);
    const apiKey = getEnv("ANGEL_ONE_API_KEY", "API_KEY");
    if (!apiKey) console.warn("⚠️ ANGEL_ONE_API_KEY (or API_KEY) is not set");
    this.apiKey = apiKey || "";
    this.smart = new SmartAPI({ api_key: this.apiKey });
    this.feedToken = null;
    this.refreshToken = null;
    this.jwt = null;
    this.lastLogin = 0;

    // cache for login inputs
    this._getCreds = () => {
      const clientId = getEnv("ANGEL_ONE_CLIENT_ID", "CLIENT_ID");
      const password = getEnv(
        "ANGEL_ONE_PASSWORD",
        "ANGEL_ONE_PIN",
        "PASSWORD"
      );
      const totpSecret = getEnv("ANGEL_ONE_TOTP_SECRET", "TOTP_SECRET");
      return { clientId, password, totpSecret };
    };
  }

  async login() {
    try {
      const { clientId, password, totpSecret } = this._getCreds();
      if (!clientId || !password || !totpSecret) {
        const missing = [
          !clientId && "ANGEL_ONE_CLIENT_ID",
          !password && "ANGEL_ONE_PASSWORD or ANGEL_ONE_PIN",
          !totpSecret && "ANGEL_ONE_TOTP_SECRET",
        ]
          .filter(Boolean)
          .join(", ");
        throw new Error(
          `Missing Angel One credentials in backend/.env: ${missing}`
        );
      }

      const totp = authenticator.generate(totpSecret);

      const resp = await this.smart.generateSession(clientId, password, totp);

      if (!resp?.data?.jwtToken) {
        throw new Error(`AngelOne login failed: ${JSON.stringify(resp)}`);
      }

      this.jwt = resp.data.jwtToken;
      this.feedToken = resp.data.feedToken;
      this.refreshToken = resp.data.refreshToken;
      this.lastLogin = Date.now();

      console.log(`✅ AngelOne login successful for ${clientId}`);
      return resp.data;
    } catch (error) {
      console.error(`❌ AngelOne login failed:`, error?.message || error);
      // Reset session markers so callers can decide to fallback
      this.jwt = null;
      this.feedToken = null;
      this.refreshToken = null;
      this.lastLogin = 0;
      throw error;
    }
  }

  async ensureSession() {
    if (!this.jwt) await this.login();
    if (Date.now() - this.lastLogin > 23 * 60 * 60 * 1000) {
      console.log("🔄 Session expired, re-logging in...");
      await this.login();
    }
  }

  async getProfile() {
    await this.ensureSession();
    return this.smart.getProfile();
  }

  async placeOrder(params) {
    await this.ensureSession();
    return this.smart.placeOrder(params);
  }

  /**
   * Get Last Traded Price.
   * 1) Try SDK method if present (some smartapi-javascript versions expose getLtpData)
   * 2) Fallback to Quote REST API with required headers
   */
  async getLTP({ exchange = "NSE", tradingsymbol, symboltoken }) {
    await this.ensureSession();
    // 1) Try SDK method when available
    try {
      if (this.smart && typeof this.smart.getLtpData === "function") {
        const resp = await this.smart.getLtpData({
          exchange: String(exchange || "NSE").toUpperCase(),
          tradingsymbol,
          symboltoken,
        });
        if (resp && resp.data && resp.data.ltp != null) return resp;
      }
    } catch (sdkErr) {
      // ignore and fallback
    }

    // 2) Fallback to REST quote API
    try {
      const exch = String(exchange || "NSE").toUpperCase();
      const tokens = { [exch]: [String(symboltoken)] };
      const quote = await this.getMarketQuote({
        mode: "LTP",
        exchangeTokens: tokens,
      });
      const fetched = quote?.data?.fetched || [];
      let row = fetched.find(
        (r) => String(r.symbolToken) === String(symboltoken)
      );
      if (!row && tradingsymbol) {
        const t = String(tradingsymbol).toUpperCase();
        row = fetched.find((r) =>
          String(r.tradingSymbol).toUpperCase().startsWith(t)
        );
      }
      const ltp = row?.ltp != null ? Number(row.ltp) : null;
      return { status: ltp != null, data: { ltp } };
    } catch (err) {
      console.error(
        `❌ getLTP failed for ${tradingsymbol} (${symboltoken}):`,
        err?.message || err
      );
      throw err;
    }
  }

  /**
   * Angel One Live Market Data API (quote endpoint)
   * mode: 'LTP' | 'OHLC' | 'FULL'
   * exchangeTokens: { NSE: ["3045","881"], BSE: ["..."], ... }
   */
  async getMarketQuote({ mode = "LTP", exchangeTokens }) {
    await this.ensureSession();
    const url =
      "https://apiconnect.angelone.in/rest/secure/angelbroking/market/v1/quote/";
    const payload = { mode: String(mode).toUpperCase(), exchangeTokens };
    const getEnv = (...keys) => keys.map((k) => process.env[k]).find((v) => v);
    const clientId = getEnv("ANGEL_ONE_CLIENT_ID", "CLIENT_ID") || "";
    const clientLocalIp = getEnv("ANGEL_ONE_LOCAL_IP") || "127.0.0.1";
    const clientPublicIp = getEnv("ANGEL_ONE_PUBLIC_IP") || "127.0.0.1";
    const clientMac = getEnv("ANGEL_ONE_MAC") || "AA:BB:CC:DD:EE:FF";
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.jwt}`,
      "X-PrivateKey": this.apiKey,
      "X-SourceID": "WEB",
      "X-UserType": "USER",
      // Additional headers required by Angel One quote API
      "X-ClientCode": clientId,
      "X-ClientLocalIP": clientLocalIp,
      "X-ClientPublicIP": clientPublicIp,
      "X-MACAddress": clientMac,
    };
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    let json;
    try {
      json = await res.json();
    } catch (e) {
      // 403 here typically means missing/invalid headers or session
      throw new Error(`AngelOne quote: non-JSON response (${res.status})`);
    }
    if (!res.ok || json.status === false) {
      const msg = json?.message || `HTTP ${res.status}`;
      throw new Error(`AngelOne quote failed: ${msg}`);
    }
    return json; // { status, message, data: { fetched, unfetched } }
  }

  // Expose session bits for streaming/polling routes
  async getWsAuth() {
    await this.ensureSession();
    const getEnv = (...keys) => keys.map((k) => process.env[k]).find((v) => v);
    const clientId = getEnv("ANGEL_ONE_CLIENT_ID", "CLIENT_ID") || "";
    return {
      apiKey: this.apiKey,
      clientId,
      jwt: this.jwt,
      feedToken: this.feedToken,
    };
  }
}

export default new AngelOneClient();
