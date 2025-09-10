// backend/utils/angelOneClient.js
import { SmartAPI } from "smartapi-javascript";
import { authenticator } from "otplib";
import dotenv from "dotenv";
dotenv.config();

class AngelOneClient {
  constructor() {
    this.smart = new SmartAPI({ api_key: process.env.API_KEY });
    this.jwt = null;
    this.lastLogin = 0;
  }

  async login() {
    const totp = authenticator.generate(process.env.TOTP_SECRET);
    const resp = await this.smart.generateSession(
      process.env.CLIENT_ID,
      process.env.PASSWORD,
      totp
    );
    if (!resp || !resp.data || !resp.data.jwtToken) {
      throw new Error(JSON.stringify(resp));
    }
    this.jwt = resp.data.jwtToken;
    this.lastLogin = Date.now();
    return resp.data;
  }

  async ensureSession() {
    if (!this.jwt) await this.login();
    // optionally check expiry & re-login if older than 23 hours
  }

  // example wrappers
  async getProfile() {
    await this.ensureSession();
    return this.smart.getProfile();
  }
  async placeOrder(params) {
    await this.ensureSession();
    return this.smart.placeOrder(params);
  }
  async getLTP({ tradingsymbol, symboltoken }) {
    await this.ensureSession();
    return this.smart.getLTP({ tradingsymbol, symboltoken });
  }

  // scrip master (SDK may have method; else use axios to download CSV and parse)
  async getScripMaster() {
    await this.ensureSession();
    return this.smart.getScripMaster();
  }
}

export default new AngelOneClient();
