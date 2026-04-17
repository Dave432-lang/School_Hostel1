const https = require('https');
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET;
if (!PAYSTACK_SECRET) throw new Error('FATAL ERROR: PAYSTACK_SECRET is not defined in environment variables.');

function paystackReq(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req  = https.request({
      hostname: 'api.paystack.co',
      path:     endpoint,
      method,
      headers: {
        Authorization:  'Bearer ' + PAYSTACK_SECRET,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, (res) => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end',  () => { try { resolve(JSON.parse(buf)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

module.exports = { paystackReq };
