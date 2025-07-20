import CryptoJS from 'crypto-js';

class BybitAPI {
  constructor(apiKey, apiSecret, environment = 'testnet') {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.environment = environment;
    this.baseUrl = this.getBaseUrl(environment);
    this.recvWindow = 5000;
  }

  getBaseUrl(environment) {
    switch (environment) {
      case 'testnet':
        return 'https://api-testnet.bybit.com';
      case 'demo':
        return 'https://api-demo.bybit.com';
      case 'mainnet':
        return 'https://api.bybit.com';
      case 'mainnet-alt':
        return 'https://api.bytick.com';
      default:
        return 'https://api-testnet.bybit.com';
    }
  }

  generateSignature(timestamp, params) {
    const paramStr = `${timestamp}${this.apiKey}${this.recvWindow}${params}`;
    return CryptoJS.HmacSHA256(paramStr, this.apiSecret).toString();
  }

  async makeRequest(method, endpoint, params = null) {
    const timestamp = Date.now();
    const url = `${this.baseUrl}${endpoint}`;
    
    let body = '';
    let queryString = '';
    
    if (method === 'POST' && params) {
      body = JSON.stringify(params);
    } else if (method === 'GET' && params) {
      queryString = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('&');
    }
    
    const signaturePayload = method === 'GET' ? queryString : body;
    const signature = this.generateSignature(timestamp, signaturePayload);
    
    const headers = {
      'X-BAPI-API-KEY': this.apiKey,
      'X-BAPI-SIGN': signature,
      'X-BAPI-TIMESTAMP': timestamp.toString(),
      'X-BAPI-RECV-WINDOW': this.recvWindow.toString(),
      'Content-Type': 'application/json'
    };
    
    try {
      let response;
      if (method === 'GET') {
        const urlWithParams = params ? `${url}?${queryString}` : url;
        response = await fetch(urlWithParams, {
          method: 'GET',
          headers
        });
      } else {
        response = await fetch(url, {
          method: 'POST',
          headers,
          body
        });
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  }

  async getPositions(category = 'linear', symbol = null, settleCoin = null) {
    const endpoint = '/v5/position/list';
    const params = { category };
    
    if (symbol) {
      params.symbol = symbol;
    } else if (category === 'linear' && settleCoin) {
      params.settleCoin = settleCoin;
    } else if (category === 'linear') {
      params.settleCoin = 'USDT';
    }
    
    return await this.makeRequest('GET', endpoint, params);
  }

  async getAccountInfo() {
    const endpoint = '/v5/account/info';
    return await this.makeRequest('GET', endpoint);
  }

  async getWalletBalance(accountType = 'UNIFIED') {
    const endpoint = '/v5/account/wallet-balance';
    const params = { accountType };
    return await this.makeRequest('GET', endpoint, params);
  }
}

// Main function to fetch positions for your React dashboard
export const fetchBybitPositions = async (apiKey, apiSecret, environment = 'testnet') => {
  try {
    const client = new BybitAPI(apiKey, apiSecret, environment);
    
    // Get all USDT linear positions
    const response = await client.getPositions('linear', null, 'USDT');
    
    if (response.retCode === 0) {
      // Filter only active positions (size > 0) and transform for your dashboard
      const activePositions = response.result.list
        .filter(position => parseFloat(position.size || '0') > 0)
        .map(position => ({
          symbol: position.symbol,
          side: position.side,
          size: position.size,
          entryPrice: position.avgPrice,
          markPrice: position.markPrice,
          unrealizedPnl: position.unrealisedPnl,
          stopLoss: position.stopLoss || '0.00',
          leverage: position.leverage,
          positionValue: position.positionValue
        }));
      
      return {
        success: true,
        positions: activePositions,
        totalPositions: activePositions.length
      };
    } else {
      throw new Error(`API Error: ${response.retMsg}`);
    }
  } catch (error) {
    console.error('Error fetching positions:', error);
    return {
      success: false,
      error: error.message,
      positions: []
    };
  }
};

// Function to get specific symbol position
export const fetchSymbolPosition = async (apiKey, apiSecret, symbol, category = 'linear', environment = 'testnet') => {
  try {
    const client = new BybitAPI(apiKey, apiSecret, environment);
    const response = await client.getPositions(category, symbol);
    
    if (response.retCode === 0) {
      const position = response.result.list[0];
      if (position && parseFloat(position.size || '0') > 0) {
        return {
          success: true,
          position: {
            symbol: position.symbol,
            side: position.side,
            size: position.size,
            entryPrice: position.avgPrice,
            markPrice: position.markPrice,
            unrealizedPnl: position.unrealisedPnl,
            stopLoss: position.stopLoss || '0.00',
            leverage: position.leverage,
            positionValue: position.positionValue
          }
        };
      } else {
        return {
          success: true,
          position: null,
          message: 'No active position found for this symbol'
        };
      }
    } else {
      throw new Error(`API Error: ${response.retMsg}`);
    }
  } catch (error) {
    console.error('Error fetching symbol position:', error);
    return {
      success: false,
      error: error.message,
      position: null
    };
  }
};

// Function to get account info
export const fetchAccountInfo = async (apiKey, apiSecret, environment = 'testnet') => {
  try {
    const client = new BybitAPI(apiKey, apiSecret, environment);
    const response = await client.getAccountInfo();
    
    if (response.retCode === 0) {
      return {
        success: true,
        accountInfo: response.result
      };
    } else {
      throw new Error(`API Error: ${response.retMsg}`);
    }
  } catch (error) {
    console.error('Error fetching account info:', error);
    return {
      success: false,
      error: error.message,
      accountInfo: null
    };
  }
};

// React Hook for easy integration
export const useBybitPositions = (apiKey, apiSecret, environment = 'testnet') => {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPositions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchBybitPositions(apiKey, apiSecret, environment);
      if (result.success) {
        setPositions(result.positions);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { positions, loading, error, fetchPositions };
};
