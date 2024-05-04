const fetch = require('node-fetch');

// Add lead to ClosingDealz CRM, for more info on the lead object, see: https://docs.closingdealz.io/developers/api-endpoints/lead-request-object
async function createLead(lead) {
  console.log("Creating a lead:");

  //const url = "https://app.closingdealz.io/api/v1/leads";
  const url = "http://localhost:5062/api/v1/leads";
  try {
    lead.notes = lead.notes?.trim().substring(0, 6942);
    const reqData = [
      {
        ...lead,
        labels: [
            process.env.CHATBOT_NAME
        ]
      }
    ];

    const response = await fetch(url, {
      method: 'post',
      headers: {
        'X-API-Key': process.env.CLOSINGDEALZ_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reqData)
    });

    const resData = await response.json();

    if (resData.succeeded) {
      console.log("Lead created successfully in ClosingDealz CRM.");
    } else {
      console.log(`Failed to create lead in ClosingDealz CRM. Message: ${resData.message}`);
    }
    
    return resData.data;
  } catch (error) {
    console.error(`An error occured when creating a lead in ClosingDealz CRM: ${error}`);
    return null;
  }
}
  
module.exports = {
  createLead
};