const fs = require('node:fs');
const { OpenAI } = require('openai');
const { assistantInstructions } = require("../prompts"); 
const crm = require('./crm');

const openAiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

let assistantId = null;
(async () => { assistantId = await createAssistant(); })()

async function startNewThread() {
    console.log("Starting a new conversation...");
    const thread = await openAiClient.beta.threads.create();
    console.log(`New thread created with ID: ${thread.id}`);
    return thread;
}

async function chat(userInput, threadId) {
    console.log(`Received message: ${userInput} for thread ID: ${threadId}`);

    await openAiClient.beta.threads.messages.create(threadId, {
        role: "user",
        content: userInput
    });

    const runStream = await openAiClient.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
        stream: true
    });

    for await (const event of runStream) {
        console.log("Current status: " + event.data.status);
        if (event.data.status === 'completed') {
            break;
        }
        else if (event.data.status === 'requires_action') {
            for (const toolCall of event.data.required_action.submit_tool_outputs.tool_calls) {
                if (toolCall.function.name === "createLead") {
                    const arguments = JSON.parse(toolCall.function.arguments);
                    const output = await crm.createLead(
                        arguments.project, arguments.description, arguments.name, arguments.email, arguments.phone, 
                    );
                    await openAiClient.beta.threads.runs.submitToolOutputs(threadId, event.data.id, {
                        tool_outputs: [{
                            tool_call_id: toolCall.id,
                            output: JSON.stringify(output)
                        }]
                    });
                }
            }
        }
    }

    const threadMessages = await openAiClient.beta.threads.messages.list(threadId);
    const response = threadMessages.data[0].content[0].text.value;
  
    console.log(`Assistant response: ${response}`);
    return response;
}

async function createAssistant() {
    console.log("Creating assistant...");
    const existingAssistantPath = '../existing_assistant_id.txt';

    if (fs.existsSync(existingAssistantPath)) {
        console.log("Loaded existing assistant.");
        return fs.readFileSync(existingAssistantPath, 'utf8');
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
    chat,
    createAssistant
};