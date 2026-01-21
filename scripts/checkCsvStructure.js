const Papa = require('papaparse');
const fs = require('fs');

const content = fs.readFileSync('public/data/claim_history.csv', 'utf8').split('\n')[0];
const parsed = Papa.parse(content);
const claims = JSON.parse(parsed.data[0][2]);

console.log('First claim:');
console.log(JSON.stringify(claims[0], null, 2));
console.log('\nFields:', Object.keys(claims[0]));
