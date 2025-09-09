import { SmartAPI } from "smartapi-javascript";
import speakeasy from "speakeasy";
import dotenv from "dotenv";

dotenv.config();

const smart_api = new SmartAPI({
  api_key: process.env.API_KEY,
});

(async () => {
  try {
    const otp = speakeasy.totp({
      secret: process.env.TOTP_SECRET,
      encoding: "base32",
    });

    console.log("Generated OTP:", otp);

    const session = await smart_api.generateSession(
      process.env.CLIENT_ID,
      process.env.PASSWORD,
      otp
    );

    console.log("✅ Session Generated:", session);
  } catch (error) {
    console.error("❌ Error:", error);
  }
})();
