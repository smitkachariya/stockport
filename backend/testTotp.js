import { authenticator } from "otplib";
import dotenv from "dotenv";

dotenv.config();

const generateTOTP = () => {
  try {
    const totp = authenticator.generate(process.env.TOTP_SECRET);
    console.log("Generated TOTP:", totp);
    return totp;
  } catch (error) {
    console.error("Error generating TOTP:", error);
  }
};

// Generate TOTP
generateTOTP();
