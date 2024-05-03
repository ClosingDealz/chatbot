const fetch = require('node-fetch');

// Add lead to ClosingDealz CRM, for more info on the lead object, see: https://docs.closingdealz.io/developers/api-endpoints/lead-request-object
async function createLead(lead) {
  console.log("Creating a lead:");
  console.log(lead);

  //const url = "https://app.closingdealz.io/api/v1/leads";
  const url = "http://localhost:5062/api/v1/leads";
  try {
    const reqData = [
      {
        ...lead,
        notes: `Lead generated from: ${process.env.CHATBOT_NAME}\n\nDescription:\n${lead.notes}`,
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

    if (resData.success) {
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