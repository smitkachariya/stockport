import React, { useState, useEffect } from "react";
import {
  Search,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  Eye,
  EyeOff,
  User,
  LogOut,
  Menu,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  History,
  DollarSign,
} from "lucide-react";

// Mock Indian stock data
const mockStocks = [
  {
    symbol: "RELIANCE",
    name: "Reliance Industries Ltd",
    price: 2456.8,
    change: 2.35,
    changePercent: 0.096,
  },
  {
    symbol: "TCS",
    name: "Tata Consultancy Services",
    price: 3892.15,
    change: -15.45,
    changePercent: -0.395,
  },
  {
    symbol: "HDFCBANK",
    name: "HDFC Bank Ltd",
    price: 1587.9,
    change: 8.75,
    changePercent: 0.555,
  },
  {
    symbol: "INFY",
    name: "Infosys Ltd",
    price: 1456.3,
    change: 12.6,
    changePercent: 0.873,
  },
  {
    symbol: "ICICIBANK",
    name: "ICICI Bank Ltd",
    price: 987.45,
    change: -5.25,
    changePercent: -0.529,
  },
  {
    symbol: "HINDUNILVR",
    name: "Hindustan Unilever Ltd",
    price: 2678.9,
    change: 18.45,
    changePercent: 0.694,
  },
  {
    symbol: "ITC",
    name: "ITC Ltd",
    price: 456.78,
    change: 3.25,
    changePercent: 0.717,
  },
  {
    symbol: "SBIN",
    name: "State Bank of India",
    price: 612.45,
    change: -8.9,
    changePercent: -1.433,
  },
  {
    symbol: "BAJFINANCE",
    name: "Bajaj Finance Ltd",
    price: 7234.6,
    change: 45.8,
    changePercent: 0.637,
  },
  {
    symbol: "MARUTI",
    name: "Maruti Suzuki India Ltd",
    price: 11456.9,
    change: -78.45,
    changePercent: -0.681,
  },
];

const initialWatchlists = [
  {
    id: 1,
    name: "Tech Stocks",
    stocks: ["TCS", "INFY"],
  },
  {
    id: 2,
    name: "Banking",
    stocks: ["HDFCBANK", "ICICIBANK"],
  },
];

const allStocks = [
  "RELIANCE",
  "TCS",
  "HDFCBANK",
  "INFY",
  "ICICIBANK",
  "HINDUNILVR",
  "ITC",
  "SBIN",
  "BAJFINANCE",
  "MARUTI",
];

// Error boundary to catch render errors and show details instead of blank screen
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
    this.setState({ error, info });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-red-50">
          <div className="bg-white p-6 rounded shadow max-w-2xl">
            <h2 className="text-xl font-bold text-red-600 mb-2">
              Application Error
            </h2>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap max-h-64 overflow-auto">
              {String(this.state.error && this.state.error.toString())}
            </pre>
            <details className="mt-4 text-xs text-gray-600">
              <summary>Stack / Info</summary>
              <pre className="whitespace-pre-wrap text-xs max-h-64 overflow-auto">
                {this.state.info?.componentStack}
              </pre>
            </details>
            <div className="mt-4 flex space-x-2">
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-2 bg-blue-600 text-white rounded"
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function WatchlistSectionInline({
  mockStocks,
  onBuy,
  onSell,
  serverWatchlists,
  createWatchlist,
  addStockToWatchlist,
  fetchWatchlists,
  authFetch,
  holdings,
}) {
  const [watchlists, setWatchlists] = React.useState(initialWatchlists);
  const [newWatchlist, setNewWatchlist] = React.useState("");
  const [selectedWatchlist, setSelectedWatchlist] = React.useState(1);

  // If serverWatchlists are provided, prefer them for display
  const listForDisplay =
    serverWatchlists && serverWatchlists.length > 0
      ? serverWatchlists
      : watchlists;

  // When server watchlists arrive, default select the first one
  React.useEffect(() => {
    if (serverWatchlists && serverWatchlists.length > 0) {
      const firstId = serverWatchlists[0]._id;
      // Only update if current selected is not among server ids
      const inServer = serverWatchlists.some(
        (w) => w._id === selectedWatchlist
      );
      if (!inServer) setSelectedWatchlist(firstId);
    }
  }, [serverWatchlists]);
  const [search, setSearch] = React.useState("");
  const [searchResults, setSearchResults] = React.useState([]);
  const [selectedStockSymbol, setSelectedStockSymbol] = React.useState(null);

  // Fetch latest watchlists on mount
  React.useEffect(() => {
    if (fetchWatchlists) fetchWatchlists();
  }, []);

  // Helper: ensure there's a server watchlist to add into
  const ensureServerWatchlist = async () => {
    if (serverWatchlists && serverWatchlists.length > 0)
      return serverWatchlists[0];
    if (createWatchlist) {
      const created = await createWatchlist("My Watchlist");
      if (created?._id) setSelectedWatchlist(created._id);
      return created;
    }
    return null;
  };

  // Add new watchlist
  const handleAddWatchlist = () => {
    if (!newWatchlist.trim()) return;
    // If createWatchlist prop provided, use backend
    if (createWatchlist) {
      createWatchlist(newWatchlist).then((created) => {
        if (created) {
          // Select the newly created watchlist
          if (created._id) setSelectedWatchlist(created._id);
          // update local view if serverWatchlists not used
          if (!serverWatchlists) setWatchlists((prev) => [created, ...prev]);
        }
      });
    } else {
      setWatchlists([
        ...watchlists,
        {
          id: Date.now(),
          name: newWatchlist,
          stocks: [],
        },
      ]);
    }
    setNewWatchlist("");
  };

  // Search stocks via backend instruments
  const handleSearch = async (e) => {
    const val = e.target.value;
    setSearch(val);
    if (val.trim()) {
      try {
        const { ok, data } = await authFetch(
          `/instruments/search?q=${encodeURIComponent(val)}`
        );
        if (ok) setSearchResults(Array.isArray(data) ? data : []);
      } catch (err) {
        setSearchResults([]);
      }
    } else {
      setSearchResults([]);
    }
  };

  // Add stock to selected watchlist
  const handleAddStock = async (item) => {
    const symbol = typeof item === "string" ? item : item.symbol;
    const fullName = typeof item === "string" ? item : item.name;
    // Ensure we have a server watchlist id to add into
    let watchlistId;
    const fromServer = serverWatchlists && serverWatchlists.length > 0;
    if (fromServer) {
      const target =
        serverWatchlists.find((w) => (w._id || w.id) === selectedWatchlist) ||
        serverWatchlists[0];
      watchlistId = target?._id;
      if (!watchlistId) return alert("Please create a watchlist first");
    } else if (createWatchlist && addStockToWatchlist) {
      const created = await ensureServerWatchlist();
      if (!created?._id) return alert("Failed to create watchlist");
      watchlistId = created._id;
    }

    if (addStockToWatchlist && watchlistId) {
      await addStockToWatchlist(watchlistId, symbol, fullName || symbol);
      // refresh from server to reflect the new symbol
      if (fetchWatchlists) await fetchWatchlists();
    } else {
      setWatchlists((prev) =>
        prev.map((wl) =>
          wl.id === selectedWatchlist && !wl.stocks.includes(symbol)
            ? { ...wl, stocks: [...wl.stocks, symbol] }
            : wl
        )
      );
    }
    setSearch("");
    setSearchResults([]);
  };

  // Get selected watchlist stocks
  const stocksInWatchlist = (() => {
    const wl = listForDisplay.find(
      (w) => (w._id || w.id) === selectedWatchlist
    );
    return wl?.stocks || [];
  })();

  // Live LTP map for watchlist
  const [watchLtp, setWatchLtp] = React.useState({});
  React.useEffect(() => {
    const symbols = stocksInWatchlist
      .map((it) => (typeof it === "string" ? it : it.symbol))
      .filter(Boolean);
    const token = localStorage.getItem("token");
    if (!symbols.length || !token) return;

    let closed = false;
    let pollTimer = null;

    // SSE primary path
    const src = new EventSource(
      `/api/stream/ltp?symbols=${encodeURIComponent(
        symbols.join(",")
      )}&token=${encodeURIComponent(token)}`
    );
    src.onmessage = (ev) => {
      try {
        const m = JSON.parse(ev.data);
        if (m && m.tradingSymbol && m.ltp != null) {
          setWatchLtp((prev) => ({
            ...prev,
            [String(m.tradingSymbol).toUpperCase()]: m.ltp,
          }));
        }
      } catch {}
    };
    // Fallback polling if SSE errors or provides no data
    const startPolling = () => {
      if (pollTimer) return;
      pollTimer = setInterval(async () => {
        try {
          const query = symbols.map(encodeURIComponent).join(",");
          // Batch first to minimize requests and use AngelOne quote directly
          const batch = await authFetch(`/market/ltp/batch?symbols=${query}`);
          const fetched =
            batch?.ok && batch?.data?.fetched ? batch.data.fetched : [];
          if (fetched.length) {
            setWatchLtp((prev) => {
              const next = { ...prev };
              fetched.forEach((row) => {
                if (row && row.tradingSymbol && row.ltp != null) {
                  next[String(row.tradingSymbol).toUpperCase()] = Number(
                    row.ltp
                  );
                }
              });
              // Also map to requested keys if they differ only by suffix
              symbols.forEach((sym) => {
                const key = String(sym).toUpperCase();
                const base = key.split("-")[0];
                const match = fetched.find((r) =>
                  String(r.tradingSymbol).toUpperCase().startsWith(base)
                );
                if (match && match.ltp != null) next[key] = Number(match.ltp);
              });
              return next;
            });
            return;
          }
          // If batch returned nothing, fall back to per-symbol with instrument resolve
          await Promise.all(
            symbols.map(async (sym) => {
              const key = String(sym).toUpperCase();
              let res = await authFetch(
                `/market/ltp?symbol=${encodeURIComponent(sym)}`
              );
              let ltp = res?.data?.data?.ltp ?? res?.data?.ltp ?? null;
              if (res.ok && ltp != null) {
                setWatchLtp((prev) => ({ ...prev, [key]: Number(ltp) }));
                return;
              }
              let instResp = await authFetch(
                `/instruments/${encodeURIComponent(key)}`
              );
              let inst = instResp?.ok ? instResp.data : null;
              if (!inst && key.includes("-")) {
                const base = key.split("-")[0];
                instResp = await authFetch(
                  `/instruments/${encodeURIComponent(base)}`
                );
                inst = instResp?.ok ? instResp.data : null;
              }
              if (inst?.symbol) {
                const exch = String(inst.exchange || "NSE").toUpperCase();
                res = await authFetch(
                  `/market/ltp?symbol=${encodeURIComponent(
                    inst.symbol
                  )}&token=${encodeURIComponent(
                    inst.token || ""
                  )}&exchange=${encodeURIComponent(exch)}`
                );
                ltp = res?.data?.data?.ltp ?? res?.data?.ltp ?? null;
                if (res.ok && ltp != null) {
                  const canonKey = String(inst.symbol).toUpperCase();
                  setWatchLtp((prev) => ({
                    ...prev,
                    [canonKey]: Number(ltp),
                    [key]: Number(ltp),
                  }));
                }
              }
            })
          );
        } catch {}
      }, 2000);
    };

    src.addEventListener("error", () => {
      startPolling();
    });

    // If no message within 3s, start fallback
    const bootstrap = setTimeout(() => startPolling(), 3000);

    return () => {
      closed = true;
      clearTimeout(bootstrap);
      if (pollTimer) clearInterval(pollTimer);
      src.close();
    };
  }, [selectedWatchlist, JSON.stringify(stocksInWatchlist)]);

  // Get selected stock details
  const selectedStock =
    mockStocks.find((s) => s.symbol === selectedStockSymbol) || null;

  // Normalize stocks list to an array of symbols
  const stocksInWatchlistSymbols = Array.isArray(stocksInWatchlist)
    ? stocksInWatchlist.map((it) => (typeof it === "string" ? it : it.symbol))
    : [];

  // Helper to get holding quantity for a symbol (match by base symbol before '-')
  const getHoldingQty = (sym) => {
    try {
      const base = String(sym || "")
        .toUpperCase()
        .split("-")[0];
      const list = Array.isArray(holdings) ? holdings : [];
      const found = list.find(
        (p) =>
          String(p.symbol || "")
            .toUpperCase()
            .split("-")[0] === base
      );
      return Number(found?.quantity || 0);
    } catch {
      return 0;
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Watchlists</h2>
        <p className="text-sm text-gray-500">
          Manage and track your favorite stocks
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {listForDisplay.map((wl) => {
          const id = wl._id || wl.id;
          return (
            <button
              key={id}
              onClick={() => setSelectedWatchlist(id)}
              className={`px-3 py-1 rounded-full font-medium border transition-colors ${
                selectedWatchlist === id
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
              }`}
            >
              {wl.name}
            </button>
          );
        })}
        <div className="flex items-center gap-2 ml-auto">
          <input
            type="text"
            placeholder="New watchlist"
            value={newWatchlist}
            onChange={(e) => setNewWatchlist(e.target.value)}
            className="border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAddWatchlist}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium"
          >
            Add
          </button>
        </div>
      </div>
      <div className="mb-4">
        {/* Hint to create/select a watchlist */}
        {(!listForDisplay || listForDisplay.length === 0) && (
          <div className="mb-2 text-sm text-gray-600">
            No watchlists yet. Click "Add" after typing a name to create one, or
            <button
              className="ml-2 px-2 py-1 text-blue-700 hover:underline"
              onClick={async () => {
                const created = await ensureServerWatchlist();
                if (created?._id) setSelectedWatchlist(created._id);
              }}
            >
              create a default watchlist
            </button>
          </div>
        )}
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search stock to add..."
                value={search}
                onChange={handleSearch}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={async () => {
                if (!search.trim()) return;
                if (searchResults.length > 0) {
                  await handleAddStock(searchResults[0]);
                  return;
                }
                try {
                  const { ok, data } = await authFetch(
                    `/instruments/${encodeURIComponent(
                      search.trim().toUpperCase()
                    )}`
                  );
                  if (ok && data) {
                    await handleAddStock(data);
                  } else {
                    alert("Symbol not found. Try a different query.");
                  }
                } catch (e) {
                  alert("Could not add symbol. Please try again.");
                }
              }}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
            >
              Add stock
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="absolute z-10 left-0 right-0 bg-white border border-gray-200 rounded-lg mt-1 max-h-64 overflow-auto shadow-lg">
              {searchResults.map((it) => (
                <div
                  key={it._id || it.symbol}
                  className="px-3 py-2 flex items-center justify-between hover:bg-blue-50 cursor-pointer"
                  onClick={() => handleAddStock(it)}
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">
                      {it.symbol}
                    </span>
                    <span className="text-gray-500 text-sm">{it.name}</span>
                  </div>
                  <button className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs">
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">
            Stocks in "
            {listForDisplay.find((w) => (w._id || w.id) === selectedWatchlist)
              ?.name || ""}
            "
          </h3>
          <span className="text-sm text-gray-500">
            {stocksInWatchlistSymbols.length} item(s)
          </span>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-4 gap-4 p-3 bg-gray-100 text-xs font-medium text-gray-700">
            <div>Symbol</div>
            <div>LTP</div>
            <div>Qty</div>
            <div className="text-right">Action</div>
          </div>

          {stocksInWatchlistSymbols.length ? (
            stocksInWatchlistSymbols.map((symbol) => {
              const key = String(symbol).toUpperCase();
              const ltp = watchLtp[key] != null ? Number(watchLtp[key]) : null;
              const qty = getHoldingQty(symbol);
              return (
                <div
                  key={symbol}
                  className="grid grid-cols-4 gap-4 p-3 border-t border-gray-200 items-center hover:bg-white"
                >
                  <button
                    className="text-left font-medium text-blue-700 hover:underline"
                    onClick={() => setSelectedStockSymbol(symbol)}
                  >
                    {symbol}
                  </button>
                  <div className="text-gray-900">
                    {ltp != null ? `₹${ltp.toLocaleString()}` : "-"}
                  </div>
                  <div className="text-gray-900">{qty > 0 ? qty : "—"}</div>
                  <div className="text-right space-x-2">
                    <button
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                      onClick={() =>
                        onBuy({
                          symbol,
                          name: symbol,
                          price: ltp || 0,
                        })
                      }
                    >
                      Buy
                    </button>
                    <button
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                      onClick={() =>
                        onSell({
                          symbol,
                          name: symbol,
                          price: ltp || 0,
                        })
                      }
                    >
                      Sell
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-gray-500">No stocks yet.</div>
          )}
        </div>
      </div>
      {/* Stock Detail Section */}
      {selectedStock && (
        <div className="mt-6 p-5 border border-gray-200 rounded-xl bg-gray-50">
          <h4 className="font-bold text-lg mb-2">
            {selectedStock.symbol} - {selectedStock.name}
          </h4>
          <div className="flex flex-wrap gap-6 text-gray-700">
            <div>
              Price:{" "}
              <span className="font-semibold">₹{selectedStock.price}</span>
            </div>
            <div>
              Change:{" "}
              <span
                className={
                  selectedStock.change >= 0 ? "text-green-600" : "text-red-600"
                }
              >
                {selectedStock.change >= 0 ? "+" : ""}
                {selectedStock.change}
              </span>
            </div>
            <div>
              Change %:{" "}
              <span
                className={
                  selectedStock.changePercent >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }
              >
                {selectedStock.changePercent >= 0 ? "+" : ""}
                {selectedStock.changePercent}%
              </span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
              onClick={() => onBuy(selectedStock)}
            >
              Buy
            </button>
            <button
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
              onClick={() => onSell(selectedStock)}
            >
              Sell
            </button>
            <button
              className="ml-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-white"
              onClick={() => setSelectedStockSymbol(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [portfolio, setPortfolio] = useState([]);
  const [walletBalance, setWalletBalance] = useState(50000);
  const [transactions, setTransactions] = useState([]);

  // Fetch transactions from backend and map to UI shape
  async function fetchTransactions() {
    try {
      const { ok, data } = await authFetch("/portfolio/transactions");
      if (!ok) return;
      const mapped = (Array.isArray(data) ? data : []).map((t) => ({
        id: t._id,
        stock: t.symbol || "WALLET",
        type:
          t.side === "BUY"
            ? "buy"
            : t.side === "SELL"
            ? "sell"
            : t.side === "WALLET_ADD"
            ? "add"
            : "withdraw",
        quantity: t.quantity || 1,
        price: Number(t.price || 0),
        total: Number((t.quantity || 1) * (t.price || 0)),
        date: new Date(t.createdAt).toLocaleDateString(),
      }));
      setTransactions(mapped);
    } catch (err) {
      console.warn("fetchTransactions failed", err?.message || err);
    }
  }
  const [showBalance, setShowBalance] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [tradeModal, setTradeModal] = useState({ open: false, type: "buy" });
  const [tradeQuantity, setTradeQuantity] = useState(1);
  const [orderType, setOrderType] = useState("MARKET");
  const [limitPrice, setLimitPrice] = useState("");
  const [walletModal, setWalletModal] = useState({ open: false, type: "add" });
  const [walletAmount, setWalletAmount] = useState("");
  // --- Watchlist API integration (hooks must be declared before any early returns) ---
  const [serverWatchlists, setServerWatchlists] = useState(null);
  const [serverPortfolio, setServerPortfolio] = useState(null);
  const [pendingOrders, setPendingOrders] = useState([]);

  // Login/Register states
  const [authMode, setAuthMode] = useState("login");
  const [authData, setAuthData] = useState({
    email: "",
    password: "",
    name: "",
  });

  // API base and helper
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  const authFetch = async (url, opts = {}) => {
    const token = localStorage.getItem("token");
    const headers = {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      console.debug("authFetch ->", {
        method: opts.method || "GET",
        url: `${API_BASE}${url}`,
        body: opts.body,
        headers,
      });
      const res = await fetch(`${API_BASE}${url}`, { ...opts, headers });
      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (err) {
        data = text;
      }
      console.debug("authFetch <-", { status: res.status, ok: res.ok, data });
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      // network or CORS error
      console.error("Network/CORS error:", err);
      return {
        ok: false,
        status: 0,
        data: { message: err.message || "Network error/CORS blocked" },
      };
    }
  };

  // Replace mock authentication with backend calls
  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      const path = authMode === "login" ? "/users/login" : "/users/register";
      const body = {
        email: authData.email,
        password: authData.password,
      };
      if (authMode === "register") body.name = authData.name;
      const { ok, status, data } = await authFetch(path, {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (!ok) {
        console.warn("Auth failed response:", { status, data });
        const msg =
          data &&
          (data.message ||
            (typeof data === "string" ? data : JSON.stringify(data)));
        alert(`Authentication failed (${status}): ${msg || "Unknown error"}`);
        return;
      }

      // store token and set current user
      if (data.token) localStorage.setItem("token", data.token);
      setCurrentUser({
        name: data.name || data._id || "User",
        email: data.email,
      });

      // fetch user-related data (watchlists, portfolio, wallet) after login
      fetchWatchlists();
    } catch (err) {
      console.error("Auth error", err);
      alert("Auth failed");
    } finally {
      setAuthData({ email: "", password: "", name: "" });
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab("dashboard");
    try {
      localStorage.removeItem("token");
    } catch {}
  };

  // Try to restore session on initial load
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      // optimistic: try to fetch server state
      fetchWatchlists();
      fetchPortfolioLive();
      fetchWallet();
      fetchTransactions();
      // We don't have user info endpoint; rely on token for session
      // If you have /users/profile endpoint, call it here and setCurrentUser
    }
  }, []);

  // Poll live portfolio while logged in
  useEffect(() => {
    if (!currentUser) return;
    fetchPortfolioLive();
    fetchTransactions();
    fetchPending();
    const id = setInterval(() => {
      fetchPortfolioLive();
      fetchTransactions();
      fetchWallet();
      if (activeTab === "pending") fetchPending();
    }, 5000);
    return () => clearInterval(id);
  }, [currentUser, activeTab]);

  // Helper to also persist trade on the server
  const persistTrade = async (type, symbol, quantity, price) => {
    try {
      if (!currentUser) return; // not logged in → skip server persistence
      if (type === "buy") {
        await authFetch("/portfolio/buy", {
          method: "POST",
          body: JSON.stringify({ symbol, quantity, avgPrice: price }),
        });
      } else {
        await authFetch("/portfolio/sell", {
          method: "POST",
          body: JSON.stringify({ symbol, quantity }),
        });
      }
      // Refresh wallet and portfolio after server-side adjustment
      try {
        await fetchWallet();
      } catch {}
      try {
        await fetchPortfolioLive();
      } catch {}
    } catch (e) {
      console.warn("persistTrade failed:", e?.message || e);
    }
  };

  // Stock trading functions
  const handleTrade = async () => {
    if (!selectedStock || tradeQuantity <= 0) return;

    const effectivePrice = Number(
      selectedStock?.currentPrice ?? selectedStock?.price ?? 0
    );

    // If LIMIT order selected, place as pending and exit
    if (orderType === "LIMIT") {
      const lp = Number(limitPrice);
      if (!lp || lp <= 0) {
        alert("Enter a valid limit price");
        return;
      }
      try {
        const side = tradeModal.type === "buy" ? "BUY" : "SELL";
        const { ok, data } = await authFetch("/orders/place", {
          method: "POST",
          body: JSON.stringify({
            side,
            symbol: selectedStock.symbol,
            quantity: tradeQuantity,
            orderType: "LIMIT",
            price: lp,
          }),
        });
        if (!ok) {
          alert((data && data.message) || "Failed to place limit order");
          return;
        }
        // refresh pending list
        fetchPending();
        setTradeModal({ open: false, type: "buy" });
        setTradeQuantity(1);
        setOrderType("MARKET");
        setLimitPrice("");
        setSelectedStock(null);
        setActiveTab("pending");
        return;
      } catch (e) {
        alert("Failed to place limit order");
        return;
      }
    }

    const totalValue = effectivePrice * tradeQuantity;
    const transaction = {
      id: Date.now(),
      stock: selectedStock.symbol,
      type: tradeModal.type,
      quantity: tradeQuantity,
      price: effectivePrice,
      total: totalValue,
      date: new Date().toLocaleDateString(),
    };

    if (tradeModal.type === "buy") {
      if (walletBalance >= totalValue) {
        setWalletBalance((prev) => prev - totalValue);
        const existingStock = portfolio.find(
          (p) => p.symbol === selectedStock.symbol
        );
        if (existingStock) {
          setPortfolio((prev) =>
            prev.map((p) =>
              p.symbol === selectedStock.symbol
                ? { ...p, quantity: p.quantity + tradeQuantity }
                : p
            )
          );
        } else {
          setPortfolio((prev) => [
            ...prev,
            { ...selectedStock, quantity: tradeQuantity },
          ]);
        }
        setTransactions((prev) => [transaction, ...prev]);
        // persist
        persistTrade(
          "buy",
          selectedStock.symbol,
          tradeQuantity,
          effectivePrice
        );
      } else {
        alert("Insufficient balance!");
        return;
      }
    } else {
      // Check against effective portfolio (server data when available)
      const sourcePortfolio =
        (serverPortfolio && serverPortfolio.length
          ? serverPortfolio
          : portfolio) || [];
      const base = (s) =>
        String(s || "")
          .toUpperCase()
          .split("-")[0];
      const existingStock = sourcePortfolio.find(
        (p) => base(p.symbol) === base(selectedStock.symbol)
      );
      if (existingStock && existingStock.quantity >= tradeQuantity) {
        setWalletBalance((prev) => prev + totalValue);
        setPortfolio((prev) =>
          prev
            .map((p) =>
              p.symbol === selectedStock.symbol
                ? { ...p, quantity: p.quantity - tradeQuantity }
                : p
            )
            .filter((p) => p.quantity > 0)
        );
        setTransactions((prev) => [transaction, ...prev]);
        // persist
        persistTrade(
          "sell",
          selectedStock.symbol,
          tradeQuantity,
          effectivePrice
        );
      } else {
        alert("Insufficient shares to sell!");
        return;
      }
    }

    setTradeModal({ open: false, type: "buy" });
    setTradeQuantity(1);
    setSelectedStock(null);
  };

  // Orders helpers (pending)
  async function fetchPending() {
    try {
      const { ok, data } = await authFetch("/orders/pending");
      if (ok) setPendingOrders(Array.isArray(data) ? data : []);
    } catch (e) {}
  }

  async function syncPending() {
    try {
      const { ok } = await authFetch("/orders/sync", { method: "POST" });
      if (ok) {
        fetchPending();
        fetchPortfolioLive();
        fetchWallet();
        fetchTransactions();
      }
    } catch (e) {}
  }

  // Wallet helpers
  async function fetchWallet() {
    try {
      const { ok, data } = await authFetch("/wallet");
      if (ok && data && typeof data.balance === "number")
        setWalletBalance(data.balance);
    } catch (e) {}
  }

  // Wallet functions
  const handleWallet = async () => {
    const amount = parseFloat(walletAmount);
    if (amount <= 0) return;

    try {
      const { ok, data } = await authFetch("/wallet/adjust", {
        method: "POST",
        body: JSON.stringify({ type: walletModal.type, amount }),
      });
      if (!ok) {
        alert((data && data.message) || "Wallet update failed");
        return;
      }
      // Update balance from server and refresh transactions
      if (data && typeof data.balance === "number")
        setWalletBalance(data.balance);
      fetchTransactions();
    } catch (err) {
      alert("Wallet update failed");
      return;
    }

    setWalletModal({ open: false, type: "add" });
    setWalletAmount("");
  };

  const filteredStocks = mockStocks.filter(
    (stock) =>
      stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const effectivePortfolio =
    serverPortfolio && serverPortfolio.length ? serverPortfolio : portfolio;

  const portfolioValue = effectivePortfolio.reduce((total, stock) => {
    const currentPrice =
      stock.currentPrice != null
        ? stock.currentPrice
        : mockStocks.find((s) => s.symbol === stock.symbol)?.price ||
          stock.price;
    return total + (currentPrice || 0) * stock.quantity;
  }, 0);

  const totalPnL = effectivePortfolio.reduce((total, stock) => {
    if (stock.pnl != null) return total + stock.pnl;
    const currentPrice =
      mockStocks.find((s) => s.symbol === stock.symbol)?.price || stock.price;
    return total + (currentPrice - stock.price) * stock.quantity;
  }, 0);

  // ADD BELOW: invested/current/returns
  const investedValue = effectivePortfolio.reduce((sum, s) => {
    const avg = s.avgPrice != null ? s.avgPrice : s.price || 0; // avgPrice from backend, fallback to purchase price
    return sum + avg * (s.quantity || 0);
  }, 0);

  const currentValue = portfolioValue;
  const overallReturn = currentValue - investedValue;
  const overallReturnPct = investedValue
    ? (overallReturn / investedValue) * 100
    : 0;

  const formatINR = (n) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(n) || 0);

  // Login/Register UI
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md border border-white/20">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              StockTrade Pro
            </h1>
            <p className="text-white/70">Indian Stock Market Portfolio</p>
          </div>

          <div className="flex mb-6">
            <button
              onClick={() => setAuthMode("login")}
              className={`flex-1 py-2 px-4 rounded-l-lg font-medium transition-all ${
                authMode === "login"
                  ? "bg-blue-600 text-white"
                  : "bg-white/10 text-white/70"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setAuthMode("register")}
              className={`flex-1 py-2 px-4 rounded-r-lg font-medium transition-all ${
                authMode === "register"
                  ? "bg-blue-600 text-white"
                  : "bg-white/10 text-white/70"
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === "register" && (
              <input
                type="text"
                placeholder="Full Name"
                value={authData.name}
                onChange={(e) =>
                  setAuthData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
                required
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={authData.email}
              onChange={(e) =>
                setAuthData((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={authData.password}
              onChange={(e) =>
                setAuthData((prev) => ({ ...prev, password: e.target.value }))
              }
              className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
              required
            />
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
            >
              {authMode === "login" ? "Login" : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- Watchlist API integration ---

  async function fetchWatchlists() {
    try {
      const { ok, data } = await authFetch("/watchlists");
      if (!ok) {
        console.warn("Could not fetch watchlists", data);
        return;
      }
      setServerWatchlists(data);
    } catch (err) {
      console.error(err);
    }
  }

  // Fetch portfolio with live prices
  async function fetchPortfolioLive() {
    try {
      const { ok, data } = await authFetch("/portfolio?live=true");
      if (!ok) return;
      setServerPortfolio(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("fetchPortfolioLive failed", err?.message || err);
    }
  }

  const createWatchlist = async (name) => {
    try {
      const { ok, data } = await authFetch("/watchlists", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      if (!ok) throw new Error(data?.message || "Create failed");
      setServerWatchlists((prev) => (prev ? [data, ...prev] : [data]));
      return data;
    } catch (err) {
      alert(err.message || "Failed to create watchlist");
    }
  };

  const addStockToWatchlist = async (watchlistId, symbol, fullName) => {
    try {
      const { ok, data } = await authFetch(
        `/watchlists/${watchlistId}/stocks`,
        {
          method: "POST",
          body: JSON.stringify({ symbol, fullName }),
        }
      );
      if (!ok) throw new Error(data?.message || "Add failed");
      setServerWatchlists((prev) =>
        prev.map((w) => (w._id === data._id ? data : w))
      );
      return data;
    } catch (err) {
      alert(err.message || "Failed to add stock");
    }
  };

  const removeStockFromWatchlist = async (watchlistId, symbol) => {
    try {
      const { ok, data } = await authFetch(
        `/watchlists/${watchlistId}/stocks/${symbol}`,
        {
          method: "DELETE",
        }
      );
      if (!ok) throw new Error(data?.message || "Remove failed");
      // Refetch or update local state
      fetchWatchlists();
      return data;
    } catch (err) {
      alert(err.message || "Failed to remove stock");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                StockTrade Pro
              </h1>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-6">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`px-3 py-2 rounded-lg font-medium ${
                  activeTab === "dashboard"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab("portfolio")}
                className={`px-3 py-2 rounded-lg font-medium ${
                  activeTab === "portfolio"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Portfolio
              </button>
              <button
                onClick={() => setActiveTab("watchlist")}
                className={`px-3 py-2 rounded-lg font-medium ${
                  activeTab === "watchlist"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Watchlist
              </button>
              <button
                onClick={() => setActiveTab("transactions")}
                className={`px-3 py-2 rounded-lg font-medium ${
                  activeTab === "transactions"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                History
              </button>
              <button
                onClick={() => setActiveTab("pending")}
                className={`px-3 py-2 rounded-lg font-medium ${
                  activeTab === "pending"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Pending Orders
              </button>
              <button
                onClick={() => setProfileModalOpen(true)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                title="Profile"
              >
                <User className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">
                  Welcome, {currentUser.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="px-4 py-2 space-y-1">
              {[
                "dashboard",
                "portfolio",
                "watchlist",
                "transactions",
                "pending",
              ].map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setMobileMenuOpen(false);
                  }}
                  className={`block w-full text-left px-3 py-2 rounded-lg font-medium capitalize ${
                    activeTab === tab
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600"
                  }`}
                >
                  {tab}
                </button>
              ))}
              <button
                onClick={() => {
                  setProfileModalOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="flex items-center w-full px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <User className="w-4 h-4 mr-2" />
                Profile
              </button>
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="px-3 py-2 text-sm text-gray-600">
                  Welcome, {currentUser.name}
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Profile Modal */}
      {profileModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Profile Details
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-gray-600 font-medium">Name:</span>
                <span className="ml-2 text-gray-900">{currentUser.name}</span>
              </div>
              <div>
                <span className="text-gray-600 font-medium">Email:</span>
                <span className="ml-2 text-gray-900">{currentUser.email}</span>
              </div>
              <div>
                <span className="text-gray-600 font-medium">
                  Available Balance:
                </span>
                <span className="ml-2 text-gray-900">
                  ₹{walletBalance.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setProfileModalOpen(false)}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        {/* Only show Watchlist on the Watchlist tab */}
        {activeTab === "watchlist" && (
          <WatchlistSectionInline
            mockStocks={mockStocks}
            onBuy={(stock) => {
              setSelectedStock(stock);
              setTradeModal({ open: true, type: "buy" });
            }}
            onSell={(stock) => {
              setSelectedStock(stock);
              setTradeModal({ open: true, type: "sell" });
            }}
            serverWatchlists={serverWatchlists}
            createWatchlist={createWatchlist}
            addStockToWatchlist={addStockToWatchlist}
            fetchWatchlists={fetchWatchlists}
            authFetch={authFetch}
            holdings={effectivePortfolio}
          />
        )}

        {/* Dashboard */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">
                      Wallet Balance
                    </p>
                    <div className="flex items-center space-x-2">
                      <p className="text-2xl font-bold text-gray-900">
                        {showBalance
                          ? `₹${walletBalance.toLocaleString()}`
                          : "••••••"}
                      </p>
                      <button
                        onClick={() => setShowBalance(!showBalance)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        {showBalance ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Wallet className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="flex space-x-2 mt-4">
                  <button
                    onClick={() => setWalletModal({ open: true, type: "add" })}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                  >
                    Add Money
                  </button>
                  <button
                    onClick={() =>
                      setWalletModal({ open: true, type: "withdraw" })
                    }
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                  >
                    Withdraw
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">
                      Portfolio Value
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      ₹{portfolioValue.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">
                      Total P&L
                    </p>
                    <p
                      className={`text-2xl font-bold ${
                        totalPnL >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      ₹{totalPnL.toLocaleString()}
                    </p>
                  </div>
                  <div
                    className={`p-3 rounded-lg ${
                      totalPnL >= 0 ? "bg-green-100" : "bg-red-100"
                    }`}
                  >
                    {totalPnL >= 0 ? (
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    ) : (
                      <TrendingDown className="w-6 h-6 text-red-600" />
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">
                      Total Holdings
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {effectivePortfolio.length}
                    </p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab("portfolio")}
                  className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-center transition-colors group"
                >
                  <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-medium text-green-700">
                    View Portfolio
                  </p>
                </button>
                <button
                  onClick={() => setActiveTab("transactions")}
                  className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-center transition-colors group"
                >
                  <History className="w-6 h-6 text-purple-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-medium text-purple-700">
                    Transaction History
                  </p>
                </button>
                <button
                  onClick={() => setWalletModal({ open: true, type: "add" })}
                  className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg text-center transition-colors group"
                >
                  <Wallet className="w-6 h-6 text-orange-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-medium text-orange-700">
                    Manage Wallet
                  </p>
                </button>
              </div>
            </div>

            {/* Recent Transactions */}
            {transactions.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Recent Transactions
                </h3>
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`p-2 rounded-lg ${
                            transaction.type === "buy"
                              ? "bg-green-100"
                              : transaction.type === "sell"
                              ? "bg-red-100"
                              : "bg-blue-100"
                          }`}
                        >
                          {transaction.type === "buy" ? (
                            <ArrowUpRight className="w-4 h-4 text-green-600" />
                          ) : transaction.type === "sell" ? (
                            <ArrowDownRight className="w-4 h-4 text-red-600" />
                          ) : (
                            <Wallet className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {transaction.stock === "WALLET"
                              ? `${
                                  transaction.type === "add"
                                    ? "Added"
                                    : "Withdrew"
                                } Money`
                              : `${transaction.type.toUpperCase()} ${
                                  transaction.stock
                                }`}
                          </p>
                          <p className="text-sm text-gray-600">
                            {transaction.date}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-medium ${
                            transaction.type === "buy" ||
                            transaction.type === "withdraw"
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {transaction.type === "buy" ||
                          transaction.type === "withdraw"
                            ? "-"
                            : "+"}
                          ₹{transaction.total.toLocaleString()}
                        </p>
                        {transaction.stock !== "WALLET" && (
                          <p className="text-sm text-gray-500">
                            {transaction.quantity} shares
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Portfolio Tab */}
        {activeTab === "portfolio" && (
          <div className="space-y-6">
            {/* Summary cards (totals across all holdings) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Invested Value */}
              <div className="p-5 rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">Invested Value</p>
                  <div className="p-2 rounded-lg bg-gray-100">
                    <DollarSign className="w-5 h-5 text-gray-700" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-bold text-gray-900">
                  {formatINR(investedValue)}
                </div>
              </div>

              {/* Current Value */}
              <div className="p-5 rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">Current Value</p>
                  <div className="p-2 rounded-lg bg-purple-100">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-bold text-gray-900">
                  {formatINR(currentValue)}
                </div>
              </div>

              {/* Absolute P&L */}
              <div className="p-5 rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">P&L</p>
                  <div
                    className={`p-2 rounded-lg ${
                      overallReturn >= 0 ? "bg-green-100" : "bg-red-100"
                    }`}
                  >
                    {overallReturn >= 0 ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                </div>
                <div
                  className={`mt-2 text-2xl font-bold ${
                    overallReturn >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatINR(overallReturn)}
                </div>
              </div>

              {/* P&L Percentage */}
              <div className="p-5 rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">P&L %</p>
                  <div
                    className={`p-2 rounded-lg ${
                      overallReturnPct >= 0 ? "bg-green-100" : "bg-red-100"
                    }`}
                  >
                    {overallReturnPct >= 0 ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                </div>
                <div
                  className={`mt-2 text-2xl font-bold ${
                    overallReturnPct >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {overallReturnPct.toFixed(2)}%
                </div>
              </div>
            </div>

            {effectivePortfolio.length === 0 ? (
              <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No holdings yet
                </h3>
                <p className="text-gray-600 mb-4">
                  Start building your portfolio by buying some stocks
                </p>
                <button
                  onClick={() => setActiveTab("watchlist")}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  Open Watchlist
                </button>
              </div>
            ) : (
              <div className="grid gap-6">
                {(serverPortfolio && serverPortfolio.length
                  ? serverPortfolio
                  : portfolio
                ).map((stock) => {
                  const currentPrice =
                    stock.currentPrice != null
                      ? stock.currentPrice
                      : mockStocks.find((s) => s.symbol === stock.symbol)
                          ?.price || stock.price;
                  const buyPrice =
                    stock.buyingPrice != null ? stock.buyingPrice : stock.price;
                  const investedVal =
                    Number(buyPrice || 0) * Number(stock.quantity || 0);
                  const currentVal =
                    Number(currentPrice || 0) * Number(stock.quantity || 0);
                  const pnl =
                    stock.pnl != null
                      ? stock.pnl
                      : (currentPrice - buyPrice) * stock.quantity;
                  const pnlPercent =
                    stock.pnlPercentage != null
                      ? stock.pnlPercentage
                      : buyPrice > 0
                      ? ((currentPrice - buyPrice) / buyPrice) * 100
                      : 0;

                  return (
                    <div
                      key={stock.symbol}
                      className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {stock.symbol}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {stock.fullName || stock.name}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedStock(stock);
                              setTradeModal({ open: true, type: "buy" });
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                          >
                            Buy More
                          </button>
                          <button
                            onClick={() => {
                              setSelectedStock(stock);
                              setTradeModal({ open: true, type: "sell" });
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                          >
                            Sell
                          </button>
                        </div>
                      </div>

                      {/* UPDATED: include Buy Price + Current Price + Invested/Current Value */}
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Quantity</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {stock.quantity}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600">
                            Buy Price (Avg)
                          </p>
                          <p className="text-lg font-semibold text-gray-900">
                            ₹{Number(buyPrice).toLocaleString()}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600">Current Price</p>
                          <p className="text-lg font-semibold text-gray-900">
                            ₹{Number(currentPrice).toLocaleString()}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600">
                            Invested Value
                          </p>
                          <p className="text-lg font-semibold text-gray-900">
                            ₹{Number(investedVal).toLocaleString()}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600">Current Value</p>
                          <p className="text-lg font-semibold text-gray-900">
                            ₹{Number(currentVal).toLocaleString()}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600">P&L</p>
                          <p
                            className={`text-lg font-semibold ${
                              pnl >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            ₹{Number(pnl).toLocaleString()} (
                            {Number(pnlPercent).toFixed(2)}%)
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Markets Tab */}
        {activeTab === "markets" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Stock Markets
              </h2>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search stocks by symbol or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Stock List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-4 md:grid-cols-6 gap-4 p-4 bg-gray-50 font-medium text-sm text-gray-700 border-b border-gray-200">
                <div>Symbol</div>
                <div className="hidden md:block">Name</div>
                <div>Price</div>
                <div>Change</div>
                <div>Change %</div>
                <div className="text-center">Action</div>
              </div>

              {filteredStocks.map((stock) => (
                <div
                  key={stock.symbol}
                  className="grid grid-cols-4 md:grid-cols-6 gap-4 p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">
                    {stock.symbol}
                  </div>
                  <div className="hidden md:block text-sm text-gray-600">
                    {stock.name}
                  </div>
                  <div className="font-medium text-gray-900">
                    ₹{stock.price.toLocaleString()}
                  </div>
                  <div
                    className={`font-medium ${
                      stock.change >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {stock.change >= 0 ? "+" : ""}₹{stock.change.toFixed(2)}
                  </div>
                  <div
                    className={`font-medium ${
                      stock.changePercent >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {stock.changePercent >= 0 ? "+" : ""}
                    {stock.changePercent.toFixed(2)}%
                  </div>
                  <div className="text-center">
                    <button
                      onClick={() => {
                        setSelectedStock(stock);
                        setTradeModal({ open: true, type: "buy" });
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm font-medium transition-colors"
                    >
                      Buy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === "transactions" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Transaction History
              </h2>
            </div>

            {transactions.length === 0 ? (
              <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <History className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No transactions yet
                </h3>
                <p className="text-gray-600">
                  Your transaction history will appear here
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-5 gap-4 p-4 bg-gray-50 font-medium text-sm text-gray-700 border-b border-gray-200">
                  <div>Date</div>
                  <div>Type</div>
                  <div>Stock/Action</div>
                  <div>Quantity/Price</div>
                  <div className="text-right">Amount</div>
                </div>

                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="grid grid-cols-5 gap-4 p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div className="text-sm text-gray-600">
                      {transaction.date}
                    </div>
                    <div>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.type === "buy"
                            ? "bg-green-100 text-green-800"
                            : transaction.type === "sell"
                            ? "bg-red-100 text-red-800"
                            : transaction.type === "add"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {transaction.type.toUpperCase()}
                      </span>
                    </div>
                    <div className="font-medium text-gray-900">
                      {transaction.stock === "WALLET"
                        ? `${
                            transaction.type === "add"
                              ? "Money Added"
                              : "Money Withdrawn"
                          }`
                        : transaction.stock}
                    </div>
                    <div className="text-sm text-gray-600">
                      {transaction.stock === "WALLET"
                        ? "-"
                        : `${
                            transaction.quantity
                          } @ ₹${transaction.price.toLocaleString()}`}
                    </div>
                    <div
                      className={`text-right font-medium ${
                        transaction.type === "buy" ||
                        transaction.type === "withdraw"
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {transaction.type === "buy" ||
                      transaction.type === "withdraw"
                        ? "-"
                        : "+"}
                      ₹{transaction.total.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pending Orders Tab */}
        {activeTab === "pending" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Pending Orders
              </h2>
              <button
                onClick={syncPending}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium"
              >
                Sync Now
              </button>
            </div>

            {pendingOrders.length === 0 ? (
              <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
                <p className="text-gray-600">No pending orders</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-5 gap-4 p-4 bg-gray-50 font-medium text-sm text-gray-700 border-b border-gray-200">
                  <div>Time</div>
                  <div>Side</div>
                  <div>Symbol</div>
                  <div>Qty @ Limit</div>
                  <div className="text-right">Status</div>
                </div>

                {pendingOrders.map((o) => (
                  <div
                    key={o._id}
                    className="grid grid-cols-5 gap-4 p-4 border-b border-gray-100"
                  >
                    <div className="text-sm text-gray-600">
                      {new Date(o.createdAt).toLocaleString()}
                    </div>
                    <div>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          o.side === "BUY"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {o.side}
                      </span>
                    </div>
                    <div className="font-medium text-gray-900">{o.symbol}</div>
                    <div className="text-sm text-gray-600">
                      {o.quantity} @ ₹{Number(o.price).toLocaleString()}
                    </div>
                    <div className="text-right font-medium text-amber-600">
                      {o.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Trade Modal */}
      {tradeModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {tradeModal.type === "buy" ? "Buy" : "Sell"}{" "}
              {selectedStock?.symbol}
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Current Price</p>
                <p className="text-xl font-bold text-gray-900">
                  ₹
                  {Number(
                    selectedStock?.currentPrice ?? selectedStock?.price ?? 0
                  ).toLocaleString()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={tradeQuantity}
                  onChange={(e) =>
                    setTradeQuantity(parseInt(e.target.value) || 1)
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Order Type */}
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={orderType === "MARKET"}
                    onChange={() => setOrderType("MARKET")}
                  />
                  Market Order
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={orderType === "LIMIT"}
                    onChange={() => setOrderType("LIMIT")}
                  />
                  Limit Order
                </label>
              </div>

              {orderType === "LIMIT" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Limit Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.05"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    placeholder={`e.g. ${Number(
                      selectedStock?.currentPrice ?? selectedStock?.price ?? 0
                    ).toFixed(2)}`}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Amount</span>
                  <span className="text-lg font-bold text-gray-900">
                    ₹
                    {Number(
                      (selectedStock?.currentPrice ??
                        selectedStock?.price ??
                        0) * tradeQuantity
                    ).toLocaleString()}
                  </span>
                </div>
              </div>

              {tradeModal.type === "sell" && (
                <div className="text-sm text-gray-600">
                  Available:{" "}
                  {effectivePortfolio.find(
                    (p) =>
                      String(p.symbol || "")
                        .toUpperCase()
                        .split("-")[0] ===
                      String(selectedStock?.symbol || "")
                        .toUpperCase()
                        .split("-")[0]
                  )?.quantity || 0}{" "}
                  shares
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => setTradeModal({ open: false, type: "buy" })}
                  className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTrade}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium text-white transition-colors ${
                    tradeModal.type === "buy"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {orderType === "LIMIT"
                    ? tradeModal.type === "buy"
                      ? "Place Limit Buy"
                      : "Place Limit Sell"
                    : tradeModal.type === "buy"
                    ? "Buy Now"
                    : "Sell Now"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Modal */}
      {walletModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {walletModal.type === "add" ? "Add Money" : "Withdraw Money"}
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Current Balance</p>
                <p className="text-xl font-bold text-gray-900">
                  ₹{walletBalance.toLocaleString()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={walletAmount}
                  onChange={(e) => setWalletAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setWalletModal({ open: false, type: "add" })}
                  className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWallet}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium text-white transition-colors ${
                    walletModal.type === "add"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {walletModal.type === "add" ? "Add Money" : "Withdraw"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const WrappedApp = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

export default WrappedApp;
