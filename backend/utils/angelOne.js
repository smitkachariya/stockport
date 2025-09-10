import { SmartAPI } from "smartapi-javascript";
import dotenv from "dotenv";

dotenv.config();

export const smart_api = new SmartAPI({
  api_key: process.env.API_KEY,
});

// ⚠️ Generate session before using APIs
(async () => {
  try {
    await smart_api.generateSession(
      process.env.CLIENT_ID,
      process.env.PASSWORD,
      process.env.TOTP_SECRET
    );
    console.log("✅ AngelOne Session Ready");
  } catch (err) {
    console.error("❌ Error creating AngelOne session:", err.message);
  }
})();
