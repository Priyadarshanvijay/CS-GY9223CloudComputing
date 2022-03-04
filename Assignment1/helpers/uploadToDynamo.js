const {
  DynamoDBClient,
  BatchWriteItemCommand
} = require("@aws-sdk/client-dynamodb");
const attr = require('dynamodb-data-types').AttributeValue;
let json_data = require('./dataInJSON');

// Set the AWS Region
const REGION = "us-east-1";
const dbclient = new DynamoDBClient({ region: REGION });


// JSON - Insert to Dynamo Table
const insertToDynamoTable = async function (json) {
  try {
   
    let dynamoDBRecords = getDynamoDBRecords(json)
    var batches = [];

    while (dynamoDBRecords.length) {
      batches.push(dynamoDBRecords.splice(0, 25));
    }

   await callDynamoDBInsert(batches)

  } catch (error) {
    console.log(error);
    return error;
  }
}

const callDynamoDBInsert = async function(batches){
  const dynamoTableName = 'yelp-restaurants'
  const totalI = batches.length;
  for(let i = 0 ; i < totalI ; ++i) {
    requestItems = {}
    requestItems[dynamoTableName] = batches[i]

    var params = {
      RequestItems: requestItems
    };

    await dbclient.send(new BatchWriteItemCommand(params))
    console.log(`${((i + 1) / totalI) * 100}% completed`)
  }
}

// Get DynamoDB records from json
const getDynamoDBRecords = function (data) {

  let dynamoDBRecords = data.map(entity => {
    entity = attr.wrap(entity)
    let dynamoRecord = Object.assign({ PutRequest: { Item: entity } })
    return dynamoRecord
  })

  return dynamoDBRecords
}



// Create DynamoDB service object
const run = async () => {
  try {
   const offset = 53;
   console.log(json_data.length)
   const partial_data = json_data.slice(offset*100, (offset+1)*100)
   const data = await insertToDynamoTable(partial_data)
    console.log("Success, items inserted", (offset + 1) * (partial_data.length));
    if(partial_data.length === 0) console.log("done")
  } catch (err) {
    console.log("Error", err);
  }
};
run();