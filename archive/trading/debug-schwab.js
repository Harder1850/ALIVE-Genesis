const https = require('https');
const querystring = require('querystring');
require('dotenv').config();

const clientId = process.env.SCHWAB_CLIENT_ID;
const clientSecret = process.env.SCHWAB_CLIENT_SECRET;

// Verify credentials are loaded
if (!clientId || !clientSecret) {
  console.error('❌ Error: Schwab API credentials not found in .env file');
  console.error('Please ensure SCHWAB_CLIENT_ID and SCHWAB_CLIENT_SECRET are set in .env');
  process.exit(1);
}

// Test with your actual redirect URI
const redirectUri = 'https://127.0.0.1'; // Try this first

console.log('Using redirect URI:', redirectUri);
console.log('Auth URL:');
console.log(`https://api.schwabapi.com/v1/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`);

console.log('\nPaste code from URL:');
process.stdin.on('data', (data) => {
  const code = data.toString().trim();
  
  const tokenData = {
    grant_type: 'authorization_code',
    code: code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri
  };
  
  console.log('Request data:', tokenData);
  
  const postData = querystring.stringify(tokenData);
  
  const options = {
    hostname: 'api.schwabapi.com',
    path: '/v1/oauth/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': postData.length
    }
  };
  
  const req = https.request(options, (res) => {
    let responseData = '';
    
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Response:', responseData);
      process.exit();
    });
  });
  
  req.write(postData);
  req.end();
});
