const fetch = require('node-fetch');

// Add lead to ClosingDealz CRM
async function createLead(company, notes, contactPerson, email, phoneNumber) {
  const url = "https://app.closingdealz.io/api/v1/leads";
  try {
    const reqData = [
      {
        Company: company,
        ContactPerson: contactPerson,
        Email: email,
        PhoneNumber: phoneNumber,
        Notes: `Lead generated from: ${process.env.CHATBOT_NAME}\n\nDescription:\n${notes}`,
        Labels: [
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
    console.error(`Failed to create lead in ClosingDealz CRM: ${error}`);
    return null;
  }
}
  
module.exports = {
  createLead
};