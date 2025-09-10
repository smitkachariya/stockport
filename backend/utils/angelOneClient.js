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
    try {
      const totp = authenticator.generate(process.env.TOTP_SECRET);
      console.log(`🔐 Generated TOTP: ${totp}`);
      
      const resp = await this.smart.generateSession(
        process.env.CLIENT_ID,
        process.env.PASSWORD,
        totp
      );
      
      console.log(`🔑 AngelOne API Response:`, resp);
      
      if (!resp || !resp.data || !resp.data.jwtToken) {
        throw new Error(`AngelOne API Error: ${JSON.stringify(resp)}`);
      }
      
      this.jwt = resp.data.jwtToken;
      this.lastLogin = Date.now();
      console.log(`✅ AngelOne login successful`);
      return resp.data;
    } catch (error) {
      console.error(`❌ AngelOne login failed:`, error.message);
      throw error;
    }
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
    try {
      await this.ensureSession();
      console.log(`📊 Fetching LTP for ${tradingsymbol} (${symboltoken})`);
      
      // Try different methods available in SmartAPI
      let response;
      if (this.smart.getLTP) {
        response = await this.smart.getLTP({ tradingsymbol, symboltoken });
      } else if (this.smart.getMarketData) {
        response = await this.smart.getMarketData({
          mode: "LTP",
          exchangeTokens: [{
            exchange: "NSE",
            token: symboltoken
          }]
        });
      } else if (this.smart.ltpData) {
        response = await this.smart.ltpData({
          exchange: "NSE",
          tradingsymbol: tradingsymbol,
          symboltoken: symboltoken
        });
      } else {
        throw new Error("No LTP method available in SmartAPI");
      }
      
      console.log(`📈 LTP Response for ${tradingsymbol}:`, response);
      return response;
    } catch (error) {
      console.error(`❌ LTP fetch failed for ${tradingsymbol}:`, error.message);
      throw error;
    }
  }

  // scrip master (SDK may have method; else use axios to download CSV and parse)
  async getScripMaster() {
    await this.ensureSession();
    return this.smart.getScripMaster();
  }
}

export default new AngelOneClient();
