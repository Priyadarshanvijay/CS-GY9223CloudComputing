const { S3, Rekognition, OpenSearch } = require("aws-sdk");
const axios = require('axios').default;

const insertIntoOS = async (data) => {
  const options = {
    method: 'POST',
    url: `https://search-photos-psl4sfbipecxwww5x35w7id6he.us-east-1.es.amazonaws.com/photos/_doc/${data.objectKey}`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic cHYyMTA5OjkwMDVARkhQIzFicm9va2x5bg=='
    },
    data
  };

  await axios.request(options);
};


exports.handler =  async function(event, context) {
  const rekognition = new Rekognition();
  const s3 = new S3();
  const os = new OpenSearch();
  os.makeRequest('POST', )
  console.log("EVENT: \n" + JSON.stringify(event, null, 2))
  const s3Info = event?.Records[0]?.s3 || {};
  const bucketName = s3Info?.bucket?.name || 'b2-hw2';
  const objectKey = s3Info?.object?.key || 'sea-ship.jpeg';
  const sParams = {
    Bucket: bucketName,
    Key: objectKey
  }
  const rParams = {
  Image: {
   S3Object: {
    Bucket: bucketName, 
    Name: objectKey
   }
  }, 
  MaxLabels: 123, 
  MinConfidence: 70
 };
 try {
  const labels = await rekognition.detectLabels(rParams).promise();
  const autoLabel  = await s3.headObject(sParams).promise()
  const rLabels = labels.Labels.map(({ Name }) => Name) || [];
  const sLabels = (autoLabel.Metadata['x-amz-meta-customLabels'] || '').split(',');
  const tLabels = [...rLabels, ...sLabels];
  console.log(tLabels)
  const osObject = {
    objectKey,
    bucket: bucketName,
    createdTimestamp: new Date(),
    labels: tLabels
  }
  console.log(osObject)
  await insertIntoOS(osObject);
 } catch (e) {
   console.log(e);
 }
  return context.logStreamName
}