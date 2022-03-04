const AWS = require('aws-sdk');
const axios = require('axios').default;

AWS.config.update({region: 'us-east-1'});

const { SQS, DynamoDB, SESV2: SESv2 } = AWS;

const TASK_QUEUE_URL = process.env.TASK_QUEUE_URL;

const parseDynamoOutput = (input) => Object.entries(input || {}).reduce((prev, [key, value]) => ({
    ...prev,
    [key]: Object.values(value || {}).shift()
  }), {});

const dynamoOutputMaker = (databaseName) => (businessIDs = []) => businessIDs.reduce((prev, cur) => {
  const temp = { ...prev };
  temp.RequestItems[databaseName].Keys.push({
    'Business_ID': { S: cur }
  });
  return temp;
}, { RequestItems: { [databaseName]: { Keys: [] } } });

const searchInDB = async (businessIDs) => {
  const dbName = process.env.DB_NAME;
  const params = dynamoOutputMaker(dbName)(businessIDs);
  const dd = new DynamoDB({ region: 'us-east-1' });
  const data = await dd.batchGetItem(params).promise();
  return data.Responses[dbName].map(parseDynamoOutput);
}


const openSearch = async (cuisine) => {
  const options = {
    method: 'GET',
    url: `${process.env.ELASTIC_SEARCH_URL}/restaurants/_search`,
    params: {q: cuisine},
    auth: {
      username: process.env.ELASTIC_SEARCH_USERNAME,
      password: process.env.ELASTIC_SEARCH_PASSWORD
    }
  };

  try {
    const data = await axios.request(options).then((response) => response.data.hits.hits.slice(0,3).map(({ _id }) => _id));
    return data
  } catch (error) {
    console.error(error);
    throw error;
  }
}

const getBusinessIDs = async (request) => {
  const businessIDs = await openSearch(request.cuisine);
  return {
    ...request, businessIDs
  };
}

const getRestaurantDetails = async (request) => {
  const restaurantDetails = await searchInDB(request.businessIDs);
  return {
    ...request, restaurantDetails
  }
}

const constructMessage = ({ cuisine, time, location, noOfPeople, restaurantDetails }) => {
  const suggestions = restaurantDetails.map(({ Name, Address }, index) => `${index + 1}. ${Name}, located at ${Address}`).join(', ');
  return `Hello! Here are my ${cuisine} restaurant suggestions \
in ${location} for ${noOfPeople} people, at ${time}: ${suggestions}. Enjoy your meal!`;
};

const sendEmail = async(response) => {
  const bodyData = constructMessage(response);
  const ses = new SESv2({ region: 'us-east-1' });
  try {
    await ses.sendEmail({
      Destination: {
        ToAddresses: [response.email]
      },
      Content: {
        Simple: {
          Body: {
            Text: {Data: bodyData, Charset: "UTF-8"}
          },
          Subject: { Charset: "UTF-8", Data: "Your Dining suggestions" }
        }
      },
      FromEmailAddress: process.env.SOURCE_EMAIL
    }).promise();
    return { receiptHandle: response.receiptHandle, success: true };
  } catch (e) {
    console.log(`Unable to send email to ${response.email}`);
    console.error(e);
    return { receiptHandle: response.receiptHandle, success: false };
  }
};



const sqs = new SQS({ region: "us-east-1" });

const processMessage = async (response) => {
  console.log(response)
  const message = JSON.parse(response['Body']);
  const receiptHandle = response['ReceiptHandle'];
  const cuisine = (message['cuisine']).toLowerCase();
  const time = message['diningTime']
  const location = message['location']
  const email = message['email']
  const noOfPeople = message['noOfPeople']

  return {
    receiptHandle,cuisine, time, location, email, noOfPeople
  };
}

const readQueue = async () => {
  const params = {
    QueueUrl: TASK_QUEUE_URL,
    MaxNumberOfMessages: 10
  };
  const data = await sqs.receiveMessage(params).promise();
  return data.Messages;
}

const deleteSentMessages = async (response) => {
  if(!response.success) return true;
  try {
    await sqs.deleteMessage({ QueueUrl: TASK_QUEUE_URL, ReceiptHandle: response.receiptHandle }).promise();
  } catch (e) {
    console.log(`Unable to remove message: ReceiptHandle = ${response.receiptHandle}`);
    console.error(e);
  }
  return true;
}

const processOneMessage = (response) => {
  return processMessage(response)
  .then(getBusinessIDs)
  .then(getRestaurantDetails)
  .then(sendEmail)
  .then(deleteSentMessages);
}

const processQueue = async() => {
  // read from queue
  // get restaurant details
  // send email
  // delete from queue
  const messages = await readQueue();
  await Promise.all((messages || []).map(processOneMessage))
};

exports.handler = async (event) => { 
  await processQueue();
};