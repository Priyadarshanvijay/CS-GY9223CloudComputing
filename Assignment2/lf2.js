const { LexRuntimeV2 } = require('aws-sdk');
const axios = require('axios').default;

const cleanseData = (interpretedValues) => {
  return interpretedValues.map((curValue) => {
    const arr = curValue.split(' ')
    .filter((s) => s != 'and' && s != 'or' && s != ',')
    .map((s) => {
      let op = s;
      if(s.slice(-1) === ',') {
        op = s.slice(0, -1);
      }
      if(op.slice(-1) === 's') {
        op = s.slice(0, -1);
      }
      return op;
    });
    return arr;
  }).flat().join(' or ');
}

const openSearch = async (searchQuery) => {
  const options = {
    method: 'GET',
    url: `${process.env.ELASTIC_SEARCH_URL}/photos/_search`,
    params: {q: searchQuery},
    auth: {
      username: process.env.ELASTIC_SEARCH_USERNAME,
      password: process.env.ELASTIC_SEARCH_PASSWORD
    }
  };
console.log(options)
  try {
    const data = await axios.request(options).then((response) => response.data.hits.hits.map(({ _id }) => _id));
    return data
  } catch (error) {
    console.error(error);
    throw error;
  }
}

exports.handler = async (event) => {
  const q = event.queryStringParameters.q;
  // sessionId="1234567890",
  //   localeId="en_US",
  //   text=usertext
  // TODO implement
  const lex = new LexRuntimeV2()
  const output = await lex.recognizeText({
    botAliasId: 'TSTALIASID',
    botId: 'F03HQ28UZM',
    sessionId: '123456789',
    localeId: 'en_US',
    text: q
  }).promise();
  const interpretedValues = output.interpretations.filter(({ intent }) => intent.name === 'SearchIntent')
    .map(({ intent }) => intent?.slots?.keywords?.value?.interpretedValue);
  const interpretedValue = cleanseData(interpretedValues);
  console.log(interpretedValue)
  const osResult = await openSearch(interpretedValue);
  const response = {
      statusCode: 200,
      body: JSON.stringify({
        keys: osResult
      }),
  };
  return response;
};
