const AWS = require('aws-sdk');
const getSlots = (event) => {
    return event["sessionState"]["intent"]["slots"]
}

const elicitSlot = (sessionAttributes,intentName,slots, slotToElicit, message) => {
    console.log("ELICIT SLOT")
    return {
        "messages": [
            message
            ], 
        "sessionState": {
        "dialogAction": {
            "slotToElicit": slotToElicit,
            "type": "ElicitSlot"
        },
        "intent": {
            "name": intentName,
            "slots": slots,
        }
        }
    }
}

const close = (sessionAttributes,intentName,fulfillmentState,message) => {
    console.log("CLOSE")
    const response = {
        "messages":[
            message
            ],
        "sessionState":{
        'dialogAction': {
            'type': 'Close',
            },
        "intent":{
            "name": intentName,
            "state":fulfillmentState
        }
        }
    }
    return response;
}

const validateLoc = (rlocation) => {
    console.log("INSIDE VALIDATE LOCATION")
    return rlocation["value"]["interpretedValue"].toLowerCase() === "manhattan"
}

const validateEmail = (email) => {
    return /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()\.,;\s@\"]+\.{0,1})+([^<>()\.,;:\s@\"]{2,}|[\d\.]+))$/.test(email["value"]["interpretedValue"]);
}

const buildValidationResult = (isValid,violatedSlot,messageContent) => {
    if (messageContent == null){
        return {
            "isValid": isValid,
            "violatedSlot" : violatedSlot 
        }
    }
    return {
        "isValid": isValid,
        "violatedSlot":violatedSlot,
        "message":{"contentType":"PlainText","content":messageContent}
    }
}

const isTimeValid = (inputTime) => {
    const hours = inputTime.slice(0,2);
    const minutes = inputTime.slice(3,5);
    const curTimeString = (new Date()).toLocaleString("en-US", {timeZone: "America/New_York", hour: '2-digit', minute: '2-digit', hour12: false});
    const curHours = curTimeString.slice(0,2);
    const curMinutes = curTimeString.slice(3,5);
    if(+curHours > +hours) return { valid: false, curHours, curMinutes };
    if(+curHours === +hours) {
        if(+curMinutes > +minutes) return { valid: false, curHours, curMinutes };
    }
    return { valid: true, curHours, curMinutes };
}

const validateDining = (cuisine,diningTime,rlocation,noOfpeople,email) => {
    console.log("VALIDATE DINING");
    const cuisines = ['chinese', 'american', 'mexican','korean','japanese','italian','french'];
    if (cuisine && cuisine["value"]["interpretedValue"]){
        if(!cuisines.includes(cuisine["value"]["interpretedValue"])){
            return buildValidationResult(false, "Cuisine",'We do not have '+cuisine["value"]["interpretedValue"]+', would you like a different type of cusine? Our most popular cusine is chinese\nWhat cuisine would you like to try?')
        }
    }
    if(diningTime && diningTime["value"]["interpretedValue"]){
        const timeMetrics = isTimeValid(diningTime["value"]["interpretedValue"]);
        if(!timeMetrics.valid){
            return buildValidationResult(false, "DiningTime",`Please enter a valid dining time after ${timeMetrics.curHours}:${timeMetrics.curMinutes}`);            
        }
    }
    if (rlocation && rlocation["value"]["interpretedValue"]){
        if (!validateLoc(rlocation)){
            return buildValidationResult(false,'Location','You can only reserve restaurants in Manhattan for now')
        }
    }
    if(email && email["value"]["interpretedValue"]){
        if(!validateEmail(email)){
            return buildValidationResult(false,"Please enter a valid email.")
        }
    }
    if(noOfpeople && noOfpeople["value"]["interpretedValue"]){
        console.log("LOOK HERE")
        if(Number(noOfpeople["value"]["interpretedValue"]) > 10 || Number(noOfpeople["value"]["interpretedValue"]) < 1){
            return buildValidationResult(false,"NumberOfPeople","Please enter a number between 1 and 10")
        }
    }
    return buildValidationResult(true,null,null)
}

const diningIntent = async (event) => {
    const cuisine = getSlots(event)["Cuisine"];
    const diningTime = getSlots(event)["DiningTime"]
    const rlocation = getSlots(event)["Location"]
    const noOfpeople = getSlots(event)["NumberOfPeople"]
    const email = getSlots(event)["Email"]
    const source = event["invocationSource"]
    if (event["proposedNextState"]){
        console.log("INSIDE CODE")
        const slots = getSlots(event)
        const validThing = validateDining(cuisine, diningTime,rlocation,noOfpeople,email)
        console.log("VALID THING")
        if(!validThing["isValid"]){
            slots[validThing["violatedSlot"]] = null
            return elicitSlot(event["sessionAttributes"],event["sessionState"]["intent"]["name"], slots, validThing["violatedSlot"],validThing["message"])
        }
        return {sessionState : event["proposedNextState"]}
    }
    const msgInfo = {"cuisine": cuisine["value"]["interpretedValue"], "diningTime": diningTime["value"]["interpretedValue"], "location":rlocation["value"]["interpretedValue"],"noOfPeople":noOfpeople["value"]["interpretedValue"],"email":email["value"]["interpretedValue"]}
    
    const params = {
        MessageAttributes: {
        "cuisine": {
          DataType: "String",
          StringValue: cuisine["value"]["interpretedValue"]
        },
        "diningTime": {
          DataType: "String",
          StringValue: diningTime["value"]["interpretedValue"]
        },
        "location": {
          DataType: "String",
          StringValue: rlocation["value"]["interpretedValue"]
        },
        "noOfPeople": {
          DataType: "Number",
          StringValue: noOfpeople["value"]["interpretedValue"]
        },
        "email": {
          DataType: "String",
          StringValue: email["value"]["interpretedValue"]
        }
    },
      MessageBody: JSON.stringify(msgInfo),
      QueueUrl: process.env.QUEUE_URL, 
    };
    const sqs = new AWS.SQS();
    await sqs.sendMessage(params).promise();
    return close(event['sessionAttributes'],event["sessionState"]["intent"]["name"],
                 'Fulfilled',
                 {'contentType': 'PlainText',
                  'content': "You\'re all set. Expect my suggestions shortly! Have a good day."})
}

const greetingIntent = () => {
    return {
    "sessionState": {
        "dialogAction": {
            "slotElicitationStyle": "Default",
            "type": "Close"
        },
        "intent": {
            "confirmationState": "Confirmed",
            "name": 'GreetingIntent',
            "state": "Fulfilled"
        }
    },
    "messages": [
        {
            "contentType": "PlainText",
            "content": "Hi there, how can I help?"
        }
        ]
    }
}

exports.handler = async (event) => {
    // TODO implement
    const curIntent = event['sessionState']['intent']['name'];
    console.log("curIntent")
    console.log(curIntent)
    const routeIntent = (curIntent) => ({
        "GreetingIntent": greetingIntent,
        "DiningSuggestionsIntent": diningIntent
    }[curIntent])
    const curIntentExecutor = routeIntent(curIntent);
    return curIntentExecutor ? curIntentExecutor(event) : null;
};
