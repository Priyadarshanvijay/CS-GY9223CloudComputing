import os
import json
import boto3
client = boto3.client('lexv2-runtime')
def lambda_handler(event, context):
    # TODO implement
    usertext=event["body"]
    usertext = json.loads(usertext)
    usertext = usertext["messages"][0]["unstructured"]["text"]
    print(usertext)
    # [0]
    botId = os.environ.get('BOT_ID')
    botAliasId = os.environ.get('BOT_ALIAS_ID')
    response = client.recognize_text(botId=botId,
    botAliasId=botAliasId,
    sessionId="1234567890",
    localeId="en_US",
    text=usertext
    )
    print(response["messages"][0]["content"])
    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            'Access-Control-Allow-Headers' : 'Content-Type',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
        },
        "body": json.dumps({
         'messages': [{'type': 'unstructured', 'unstructured': {'text': response["messages"][0]["content"]}}]
        })
    }