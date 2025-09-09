import speakeasy from "speakeasy";
import dotenv from "dotenv";

dotenv.config();

const otp = speakeasy.totp({
  secret: process.env.TOTP_SECRET,
  encoding: "base32",
});

console.log("Generated OTP:", otp);
