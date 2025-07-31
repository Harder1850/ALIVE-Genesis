const https = require('https');
const querystring = require('querystring');
const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const clientId = '1wzwOrhivb2PkR1UCAUVTKYqC4MTNYlj';
const clientSecret = 'HwcUGETjgNAb4opa';
const redirectUri = 'https://127.0.0.1'; // This matches your registered URI

console.log('🔗 Go to this URL to authorize:');
console.log(`https://api.schwabapi.com/v1/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`);
console.log('\n📋 Paste your authorization code:');

rl.question('Code: ', (code) => {
  console.log('Processing...');
  
  const tokenData = {
    grant_type: 'authorization_code',
    code: code.trim(),
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri
  };
  
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
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      if (res.statusCode === 200) {
        const tokens = JSON.parse(data);
        fs.writeFileSync('.schwab-tokens.json', JSON.stringify(tokens, null, 2));
        console.log('✅ Success! Tokens saved.');
        console.log('Access token:', tokens.access_token.substring(0, 20) + '...');
      } else {
        console.log('❌ Error:', data);
      }
      rl.close();
    });
  });
  
  req.on('error', (e) => {
    console.error('Request error:', e);
    rl.close();
  });
  
  req.write(postData);
  req.end();
});
