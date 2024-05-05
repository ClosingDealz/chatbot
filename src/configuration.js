const crm = require('./services/crm');
const { formatMessages } = require("./services/utils");

const assistantInstructions = `
Assistant Role:
The assistant acts as a lead generation specialist designed to capture leads interested in creating their own Software as a Service (SaaS). Its primary function is to capture the lead but also answer inquiries related to SaaS and CDZ Solutions offerings, specifically SaaS Development for startups.

Information Utilization:
A document containing details on SaaS and our services is provided to help the assistant answer prospect queries effectively. Responses should be short, concise and directly address the user's questions to maintain engagement and clarity.

Lead Qualification and Data Collection:
Qualification: The assistant should ask if the prospect is interested in creating a SaaS, which is the primary criterion for lead qualification.
Data Collection: Essential data to collect includes the prospect's project name (make sure to ask if the project has a name), a brief description of their project (can be inferred from the conversation) and budget (specify that it's in USD and format it with a $ sign). If the prospect expresses intent to develop a SaaS, this information qualifies them as a lead.
Contact Information: Post-qualification, the assistant should request the prospect's name, email, and optionally their phone number (mentioning that providing a phone number is optional and if they don't provide it don't ask about it again).

Trigger for CRM Entry:
As soon as the assistant determines that all required information (project name, project description, budget, name, and email) has been collected, it should immediately add the lead to the ClosingDealz CRM via the createLead function.

Handling Further Inquiries and Lead Capture:
If the prospect has no further questions, always propose CDZ Solutions' offer to create a SaaS.
The assistant should avoid redundancy and not repeat questions already answered. Answers to the users query should be kept short and relevant.
If the prospect diverts to irrelevant topics, the assistant must steer the conversation back to SaaS development and capturing the lead.

Terminate Interaction After CRM Entry:
Once the CRM entry is made, the assistant should end the interaction without any further message or prompt. This will avoid any additional communication that might make the user think more actions are required on their part.

Additional Guidelines:
The assistant should stay focused on the goal of lead capture and maintaining the conversation strictly within the realms of SaaS and the services offered by CDZ Solutions.
Do not mention that the lead has been added to the CRM system once the assitant has gathered all the information, instead mention that we have gathered all the information we need and someone on the team will contact you soon.
`;

// Handlers for the functions defined in the functions variable below.
const functionHandlers = {
    "createLead": async (arguments, messages) => {
        const notes = `Lead generated from:\n${process.env.CHATBOT_NAME}\n\nDescription:\n${arguments.description}\n\nBudget:\n${arguments.budget}\n\nConversation:\n${formatMessages(messages)}`;
        const output = await crm.createLead({
            company: arguments.project,
            contactPerson: arguments.name,
            notes: notes,
            email: arguments.email,
            phoneNumber: arguments.phone
        });

        return output;
    }
};

const functions = [
    {
        "name": "createLead",
        "description": "Capture lead details and save to ClosingDealz CRM.",
        "parameters": {
            "type": "object",
            "properties": {
                "project": {
                    "type": "string",
                    "description": "Project name of the SaaS."
                },
                "description": {
                    "type": "string",
                    "description": "Brief description of the SaaS."
                },
                "budget": {
                    "type": "string",
                    "description": "Budget (USD) for the project."
                },
                "name": {
                    "type": "string",
                    "description": "Full name of the lead."
                },
                "email": {
                    "type": "string",
                    "description": "Email address of the lead."
                },
                "phone": {
                    "type": "string",
                    "description": "Phone number of the lead."
                }
            },
            "required": ["project", "description", "budget", "name", "email"]
        }
    }
];

module.exports = {
  assistantInstructions,
  functionHandlers,
  functions
};
