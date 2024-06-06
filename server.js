const express = require('express');
const bodyParser=require("body-parser");
const request = require('request');
const axios = require("axios");
require('dotenv').config();
const {setTimeout} = require('timers/promises');
const { lstatSync } = require('fs');
const END_POINT = 'https://graph.facebook.com/';

const app = express();

app.set('port', process.env.PORT);
// parse application/json
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'));
});

const verify_token = process.env.VERIFY_TOKEN;
const access_token = process.env.ACCESS_TOKEN;
const recipient_phone_number = process.env.RECIPIENT_PHONE_NUMBER;

app.get('/', (req, res) => {
    const authorizationUrl = `${END_POINT}${process.env.VERSION}/dialog/oauth?client_id=${process.env.APP_ID}&redirect_uri=${process.env.REDIRECT_URI}&scope=whatsapp_business_messaging&response_type=code`;
    res.redirect(authorizationUrl);
});

/* facebook verification */
// Accepts GET requests at the /webhook endpoint. Setup webhook initially.

app.get('/webhook', function (req, res) {
	
	let mode = req.query["hub.mode"];
	let challenge = req.query["hub.challenge"];
	let verifyToken = req.query["hub.verify_token"];

	if (mode && verifyToken) {
		if (mode === "subscribe" && verifyToken === verify_token) {
			res.status(200).send(challenge);
		} else {
			// if verify tokens do not match
			res.sendStatus(403);
		}
	}else{
		res.status(200);
	}
});


//SENDING MESSAGE
app.post("/sendMessage", async function (req, res) {

	let recipientData = req.body.to;
	let listOfRecipients = recipientData.split(",");
	let data = "";
	let count = listOfRecipients.length;
	let deliveredMessage = [];	
	if (listOfRecipients !== "") {
		for (var recipientNumber of listOfRecipients) {
			if (req.body.type === "template") {
				data = JSON.stringify({
					"messaging_product": "whatsapp",
					"to": recipientNumber,
					"type": req.body.type,
					"template": {
						"name": "aroopa_apps",
						"language": {
							"code": "en_US"
						}
					}
				})
			} else {
				data = JSON.stringify({
					"messaging_product": "whatsapp",
					"to": recipientNumber,
					"type": req.body.type,
					"preview_url": true,
					"text": {
						"body": req.body.text.body
					}
				})
			}
			var config = {
				method: 'Post',
				url: `${process.env.END_POINT}${process.env.VERSION}/${process.env.PHONE_NUMBER_ID}/messages`,
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${access_token}`,
				},
				data: data
			};

			axios.request(config)
				.then((response) => {
					console.log(JSON.stringify(response.data));
					deliveredMessage.push(response.data);
					count = count -1;
					if(count === 0){
						return res.json(deliveredMessage);
					}					
				})
				.catch((error) => {
					console.log(error);
					return res.json(error);
				});
			const waitMs = req.params.milliseconds || 2000;
			await setTimeout(waitMs);
		}
	}
});

//Incoming message
//received messages and message status notifications 
app.post("/webhook", (req, res) => {
  
	try{
	// res.sendStatus(201);
	if (req.body.object) {
		let body = req.body;
		let entry = body.entry[0];
		let changes = entry.changes[0];
		let value = changes.value;
		let messageObject = value?.messages;
		let messageStatus = value?.statuses ? value.statuses[0] : "";
		let currDate = new Date()
		console.log(JSON.stringify(body));
		if(messageStatus.status === 'sent' || messageStatus.status === 'read' || messageStatus.status === 'delivered'){
			console.log(currDate);
			console.log(messageStatus.id)
			console.log(messageStatus.status);
			res.sendStatus(200);
			// res.sendStatus(202).send(messageStatus.status);
		}else if(messageStatus.status === 'failed'){
			console.log(currDate);
			console.log(messageStatus.id)
			console.log(messageStatus.status);
			res.sendStatus(200);
		}
		else if(messageObject[0]){
			console.log(currDate);
			console.log(messageObject[0].id)
			console.log(messageObject[0].text.body);
			res.sendStatus(200);
			// res.sendStatus(200).send(messageStatus.status);
		}
	}
		// if(messageObject){
		// 	let from = messageObject.from;
		// 	let msg_body= messageObject.text.body;
		// 	let phone_number_id = value.metadata.phone_number_id;

		// 	console.log(msg_body);
		// }


	//   if (
	// 	req.body.entry &&
	// 	req.body.entry[0].changes &&
	// 	req.body.entry[0].changes[0] &&
	// 	req.body.entry[0].changes[0].value.messages &&
	// 	req.body.entry[0].changes[0].value.messages[0] 		
	//   ) {
	// 	let phone_number_id = req.body.entry[0].changes[0].value.metadata.phone_number_id;
	// 	let from = req.body.entry[0].changes[0].value.messages[0].from;
	// 	let msg_body = req.body.entry[0].changes[0].value.messages[0].text.body; 

	// 	axios({
	// 	  method: "POST",
	// 	  url: `${process.env.END_POINT}${process.env.VERSION}/${phone_number_id}/messages?access_token=${process.env.ACCESS_TOKEN}`,
	// 	  headers: {
	// 		Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
	// 		"Content-Type": "application/json",
	// 	  },
	// 	  data: {
	// 		messaging_product: "whatsapp",
	// 		to: from,
	// 		text:{
	// 				body: msg_body
	// 			 }
	// 		}
	// 	});
		// .then((response) => {
		// 	console.log("web");
		// 	// console.log(response.data[0]["generated_text"]);
		// 	// const reply = response.data[0]["generated_text"].split("[/INST]")[1] //.split("  </s>", 1)[0];
		// 	// Usage
		// 	// sendTextMessage(reply, recipient_phone_number)
		// 	// 	.then(status => console.log('Message sent with status:', status))
		// 	// 	.catch(err => console.error(err));
		//   })
		//   .catch((error) => {
		// 	console.error(error);
		//   });
		 // res.sendStatus(200);
	  
	//   else {
	// 	// Return a '404 Not Found' if event is not from a WhatsApp API
	// 	res.sendStatus(404);
	//   }
	// } 
	// else {
	// 	// Return a '404 Not Found' if event is not from a WhatsApp API
	// 	res.sendStatus(404);
	//   }
}
catch(e){
	console.log(e);
}
  });

// const callBackURL = "http://localhost:8000/webhook"; //Need to provide the callback url here
 //web hook verify token

// for facebook verification
// app.get("/webhook",function(req, res){
// 	var datetime = new Date();
//     console.log("2", datetime);
// 	let mode=req.query["hub.mode"];
// 	let challenge=req.query["hub.challenge"];
// 	let verifyToken=req.query["hub.verify_token"];

	
// 	if(mode && verifyToken){
// 		if(mode === "subscribe" && verifyToken === myToken){
// 			console.log("Validating webhook");
// 			// res.status(200).send(challenge);
// 			// res.end();
// 			res.sendStatus.code(200);
// 			res.setBody(challenge);
// 		}else{
// 			console.error("Verification failed. Make sure the validation tokens match.");
//     		// res.status(403).end();
// 			res.sendStatus.code(403);
// 		}
// 	}
// });

// //Incoming message
// app.post("/webhook", (req, res) => {
// 	let body_param = req.body;
// 	var datetime = new Date();
//     console.log("3", datetime);
	
// 	let messaging_events = req.body.entry[0].messaging;
// 	if (body_param.object) {
// 		if (body_param.entry && 
// 			body_param.entry[0].changes && 
// 			body_param.entry[0].changes[0].value.messages && 
// 			body_param.entry[0].changes[0].value.messages[0] &&
// 			body_param.entry[0].changes[0].value?.statuses &&
// 			body_param.entry[0].changes[0].value?.statuses[0]?.status !== 'sent'
// 			){
// 				let phone_number_id = body_param.entry[0].changes[0].value.metadata.phone_number_id;
// 				let from = body_param.entry[0].changes[0].value.messages[0].from;
// 				let msg_body = body_param.entry[0].changes[0].value.messages[0].text.body;
				
// 				console.log(msg_body);
// 			// axios({
// 			// 	method: "POST",
// 			// 	url: `${process.env.END_POINT}${process.env.VERSION}/${phone_number_id}/messages?access_token=${process.env.ACCESS_TOKEN}`,
// 			// 	data: {
// 			// 		messaging_product: "whatsapp",
// 			// 		to: from, // verify the 
// 			// 		text:{
// 			// 			body: msg_body
// 			// 		}
// 			// 	},
// 			// 	headers:{
// 			// 		"Content-Type":"application/json"
// 			// 	}

// 			// });

// 			// res.sendStatus(200);
// 			res.status(200).send("Message Received");
// 			res.end();
// 		}else{
// 			res.sendStatus(404); //cannot find a resource 
// 			res.end();
// 		}
// 	}
// });

// app.listen(8000,()=>{
// 	console.log("Webhook is listening");
// });

// app.get("/",(req, res)=>{
// 	res.status(200).send("This is webhook setup");
// })