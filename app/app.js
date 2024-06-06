"use strict";

// Access token for your app
// (copy token from DevX getting started page
// and save it as environment variable into the .env file)
const token = process.env.WHATSAPP_TOKEN;
const hf_api_token = process.env.HF_TOKEN;
const phone_number_id = process.env.PHONE_NUMBER_ID
const recipient_phone_number = process.env.RECIPIENT_PHONE_NUMBER
const prompt = `<s>[INST] <<SYS>>
You are a helpful, respectful and honest assistant. Always answer as helpfully as possible, while being safe.  Your answers should not include any harmful, unethical, racist, sexist, toxic, dangerous, or illegal content. Please ensure that your responses are socially unbiased and positive in nature.
If a question does not make any sense, or is not factually coherent, explain why instead of answering something not correct. If you don't know the answer to a question, please don't share false information.
<</SYS>>`

class WhatsAppClient {
    constructor() {
        this.API_URL = "https://graph.facebook.com/v17.0/"+phone_number_id;
        this.headers = {
            "Authorization": "Bearer "+ token,
            "Content-Type": "application/json"
        };
    }

    async sendTextMessage(message, phoneNumber) {
        
        const payload = {
            "messaging_product": "whatsapp",
            "to": phoneNumber,
            "type": "text",
            "text": {
                "preview_url": false,
                "body": message
            }
        };

        try {
            const response = await axios.post(`${this.API_URL}/messages`, payload, { headers: this.headers });
            return response.status;
        } catch (error) {
            console.error(error);
            return error.response.status;
        }
    }
}
const client = new WhatsAppClient();

// Imports dependencies and set up http server
const request = require("request"),
  express = require("express"),
  body_parser = require("body-parser"),
  axios = require("axios").default,
  app = express().use(body_parser.json()); // creates express http server

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log("webhook is listening"));

// Accepts POST requests at /webhook endpoint
app.post("/webhook", (req, res) => {
  // Parse the request body from the POST
  let body = req.body;

  // Check the Incoming webhook message
  console.log(JSON.stringify(req.body, null, 2));
  

  // info on WhatsApp text message payload: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#text-messages
  if (req.body.object) {
    if (
      req.body.entry &&
      req.body.entry[0].changes &&
      req.body.entry[0].changes[0] &&
      req.body.entry[0].changes[0].value.messages &&
      req.body.entry[0].changes[0].value.messages[0]
    ) {
      let phone_number_id =
        req.body.entry[0].changes[0].value.metadata.phone_number_id;
      let from = req.body.entry[0].changes[0].value.messages[0].from; // extract the phone number from the webhook payload
      let msg_body = req.body.entry[0].changes[0].value.messages[0].text.body; // extract the message text from the webhook payload
      axios({
        method: "POST", // Required, HTTP method, a string, e.g. POST, GET
        url: "https://api-inference.huggingface.co/models/meta-llama/Llama-2-70b-chat-hf",
        headers: {
          Authorization: "Bearer " + hf_api_token,
          "Content-Type": "application/json",
        },
        data: {
          inputs: prompt + "\n" + msg_body + " [/INST]",
          parameters:{"max_new_tokens":1024},
        },
      })
        .then((response) => {
          console.log(response.data[0]["generated_text"]);
          const reply = response.data[0]["generated_text"].split("[/INST]")[1] //.split("  </s>", 1)[0];
          // Usage
          client.sendTextMessage(reply, recipient_phone_number)
              .then(status => console.log('Message sent with status:', status))
              .catch(err => console.error(err));
        })
        .catch((error) => {
          console.error(error);
        });
    }
  res.sendStatus(200);
  } else {
    // Return a '404 Not Found' if event is not from a WhatsApp API
    res.sendStatus(404);
  }
});

// Accepts GET requests at the /webhook endpoint. You need this URL to setup webhook initially.
// info on verification request payload: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
app.get("/webhook", (req, res) => {
  /**
   * UPDATE YOUR VERIFY TOKEN
   *This will be the Verify Token value when you set up webhook
   **/
  const verify_token = process.env.VERIFY_TOKEN;

  // Parse params from the webhook verification request
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  // Check if a token and mode were sent
  if (mode && token) {
    // Check the mode and token sent are correct
    if (mode === "subscribe" && token === verify_token) {
      // Respond with 200 OK and challenge token from the request
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});