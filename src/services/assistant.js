const fs = require('node:fs');
const { Configuration, OpenAI } = require('openai');
const { assistantInstructions } = require("../prompts"); 
const { cwd } = require('node:process');

const openAiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

let assistantId = null;
(async () => { assistantId = await createAssistant(); })()

async function startNewThread() {
    console.log("Starting a new conversation...");
    const thread = await openAiClient.createChatThread();
    console.log(`New thread created with ID: ${thread.id}`);
    return thread;
}

async function createAssistant() {
    console.log("Creating assistant.");
    const existingAssistantPath = '../existing_assistant_id.txt';

    if (fs.existsSync(existingAssistantPath)) {
        console.log("Loaded existing assistant.");
        return await fs.readFile(existingAssistantPath, { encoding: 'utf8' });
    }
    
    const knowledgeDocument = await fs.createReadStream("./knowledge.docx");
    const fileResponse = await openAiClient.files.create({
        file: knowledgeDocument,
        purpose: 'assistants',
    });

    const vectorStore = await openAiClient.beta.vectorStores.create({
        name: "Knowledge",
        file_ids: [fileResponse.id]
    });

    const assistant = await openAiClient.beta.assistants.create({
        instructions: assistantInstructions.trim(),
        model: "gpt-3.5-turbo",
        tools: [
          {
            "type": "file_search"
          },
          {
            "type": "function",
            "function": {
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
                    "required": ["project", "description", "name", "email"]
                }
            }
          }
        ],
        tool_resources: { file_search: { vector_store_ids: [vectorStore.id] } },
    });

    await fs.writeFile(existingAssistantPath, assistant.id, (error) => {});
    console.log("Succesfully create a new assistant.");
    return assistant.id;
}

module.exports = {
    startNewThread,
    createAssistant
};