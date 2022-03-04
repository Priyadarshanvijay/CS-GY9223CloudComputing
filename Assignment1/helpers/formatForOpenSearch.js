import fs from 'fs/promises';
import rawData from '../csvjson.js';


/**
 * 
 * @param {Object} BusinessDetails 
 * @param {String} BusinessDetails.Business_ID
 * @param {String} BusinessDetails.Cuisine
 * @returns Promise<void>
 */
const appendToFile = async ({ Business_ID: id, Cuisine: cuisine }) => {
  let data = await fs.readFile('ES.json');
  const line1 = `{ "index" : { "_index": "restaurants", "_id" : "${id}" } }`;
  const line2 = `{"Cuisine": "${cuisine}"}`;
  data += `${line1}\n${line2}\n`;
  await fs.writeFile('ES.json', data);
}


for(let i = 0 ; i < rawData.length ; ++i) {
  // BAD!!!! Blocks event loop but needed sequential execution
  await appendToFile(rawData[i])
}


// Creates a json file with Data of following format
/**
{ "index" : { "_index": "restaurants", "_id" : "XjeGryxde-tQZF_Ewu7NCw" } }
{"Cuisine": "korean"}
{ "index" : { "_index": "restaurants", "_id" : "ykXZyQBXxoOMoZfaZMnHmg" } }
{"Cuisine": "american"}
{ "index" : { "_index": "restaurants", "_id" : "uaFHoq-a5XqxF-bsOK9_Qg" } }
{"Cuisine": "chinese"}
{ "index" : { "_index": "restaurants", "_id" : "IGBaeCme2FrJhzrFFGOfnA" } }
{"Cuisine": "seafood"}
{ "index" : { "_index": "restaurants", "_id" : "IhSVn0TaX8xXb3wcQ-fgcA" } }
{"Cuisine": "chinese"}

 */