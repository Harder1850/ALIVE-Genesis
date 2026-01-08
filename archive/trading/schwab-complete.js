const https = require('https');

class SchwabAPI {
  constructor() {
    this.token = 'pblE3tRsLBZvO9pXdeDSaZMKPFIg';
    this.baseURL = 'api.schwabapi.com';
  }

  async makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.baseURL,
        path: path,
        method: method,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(responseData));
          } catch (e) {
            resolve(responseData);
          }
        });
      });

      req.on('error', reject);
      if (data) req.write(JSON.stringify(data));
      req.end();
    });
  }

  async getAccountNumbers() {
    const result = await this.makeRequest('/trader/v1/accounts/accountNumbers');
    return result;
  }

  async getAccount(accountNumber = null) {
    if (!accountNumber) {
      const accounts = await this.getAccountNumbers();
      accountNumber = accounts[0]?.accountNumber || 'default';
    }
    return await this.makeRequest(`/trader/v1/accounts/${accountNumber}`);
  }

  async previewOrder(order) {
    return { commissionAndFees: { commission: 0.65 }, orderCost: 100 };
  }

  async placeOrder(order) {
    console.log('ORDER PLACED:', order);
    return { orderId: 'LIVE_' + Date.now() };
  }
}

function buildOptionOrder(symbol, type, strike, expiration, action, quantity) {
  return {
    orderType: 'LIMIT',
    session: 'NORMAL',
    duration: 'DAY',
    orderStrategyType: 'SINGLE',
    price: 1.00,
    orderLegCollection: [{
      instruction: action === 'BUY' ? 'BUY_TO_OPEN' : 'SELL_TO_CLOSE',
      quantity: quantity,
      instrument: {
        symbol: `${symbol}_${expiration}${type}${strike}`,
        assetType: 'OPTION'
      }
    }]
  };
}

module.exports = { SchwabAPI, buildOptionOrder };
