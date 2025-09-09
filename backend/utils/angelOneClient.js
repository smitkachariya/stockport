import axios from "axios";

const ANGEL_BASE_URL =
  "https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1";
const CLIENT_CODE = process.env.ANGEL_CLIENT_CODE;
const API_KEY = process.env.ANGEL_API_KEY;
const JWT_TOKEN = process.env.ANGEL_JWT_TOKEN; // from AngelOne login

const headers = {
  "X-UserType": "USER",
  "X-SourceID": "WEB",
  "X-ClientLocalIP": "192.168.0.1",
  "X-ClientPublicIP": "192.168.0.1",
  "X-MACAddress": "00:0a:95:9d:68:16",
  "X-PrivateKey": API_KEY,
  Authorization: `Bearer ${JWT_TOKEN}`,
  "Content-Type": "application/json",
};

class AngelOneClient {
  static async placeOrder({
    symbol,
    quantity,
    transactionType,
    orderType,
    price,
  }) {
    const payload = {
      exchange: "NSE",
      tradingsymbol: symbol,
      transactiontype: transactionType, // BUY or SELL
      ordertype: orderType, // MARKET or LIMIT
      quantity,
      price: orderType === "LIMIT" ? price : 0,
      variety: "NORMAL",
      producttype: "DELIVERY",
      duration: "DAY",
    };

    const response = await axios.post(`${ANGEL_BASE_URL}/placeOrder`, payload, {
      headers,
    });
    return response.data;
  }
}

export default AngelOneClient;
