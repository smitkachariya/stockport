import { SmartAPI, WebSocketV2 } from "smartapi-javascript";
import { authenticator } from "otplib";
import dotenv from "dotenv";
dotenv.config();
// PORT=5000
// MONGO_URI=mongodb://localhost:27017/stockportfolio
// API_KEY=SFp1F8Sc
// CLIENT_ID=K62922094   # Kxxxx
// PASSWORD=1208
// TOTP_SECRET=AF45KHBL7E2E3FUV55NTSE5HMQ   # from Google Authenticator setup
// JWT_SECRET=mySuperSecretKeyThatIsHardToGuess123!@#$

const smart_api = new SmartAPI({
  api_key: process.env.API_KEY,
});

async function run() {
  const totp = authenticator.generate(process.env.TOTP_SECRET);

  const session = await smart_api.generateSession(
    process.env.CLIENT_ID, // ✅ use CLIENT_CODE, not CLIENT_ID
    process.env.PASSWORD,
    totp
  );

  if (!session || !session.data) {
    throw new Error("Login failed! Response: " + JSON.stringify(session));
  }

  console.log("✅ Logged in:", session.data);

  const ws = new WebSocketV2({
    jwttoken: session.data.jwtToken,
    apikey: process.env.API_KEY,
    clientcode: process.env.CLIENT_ID,
    feedtype: session.data.feedToken,
  });

  console.log("🔌 Connecting to WebSocket...");

  // ws.on("connect", () => {
  //   console.log("🔌 WS connected, subscribing...");
  //   ws.fetchData({
  //     exchangeType: 1, // NSE_CM
  //     tokens: ["2885"], // RELIANCE token
  //     action: 1, // Subscribe
  //     mode: 1, // LTP
  //   });
  // });

  // ws.on("ticks", (data) => {
  //   console.log("📈 Tick data:", JSON.stringify(data, null, 2));
  //   ws.close();
  // });

  ws.connect()
    .then((res) => {
      let json_req = {
        correlationID: "correlation_id",
        action: 1,
        mode: 1,
        exchangeType: 1,
        tokens: ["2885"],
      };

      ws.fetchData(json_req);
      ws.on("tick", receiveTick);

      function receiveTick(data) {
        console.log("receiveTick:::::", data);
      }
    })
    .catch((err) => {
      console.error("❌ WS connection error:", err.message);
    });
}

run().catch(console.error);
