const fs = require('node:fs');
var crypto = require('crypto');
const path = require('path');
const { OpenAI } = require('openai');
const { assistantInstructions } = require("../prompts"); 
const crm = require('./crm');

const openAiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

let assistantId = null;
async function init() {
    console.log("Initializing the assistent...");
    assistantId = await createAssistant();
}

async function startNewThread() {
    console.log("Starting a new thread...");
    const thread = await openAiClient.beta.threads.create();
    console.log(`New thread created with ID: ${thread.id}`);

    return thread;
}

const activeRuns = new Map();
async function chat(userInput, threadId) {
    console.log(`Received message: '${userInput}' in thread: ${threadId}`);

    // Check if there's an active run in the thread.
    if (activeRuns.has(threadId)) {
        console.log(`A run is already active in thread ${threadId}. Waiting for it to complete.`);
        return "Sorry, a conversation is already in progress. Please try again later.";
    }

    await openAiClient.beta.threads.messages.create(threadId, {
        role: "user",
        content: userInput
    });

    const runStream = await openAiClient.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
        stream: true
    });

    // Mark the thread as having an active run.
    activeRuns.set(threadId, true);

    console.log(`Waiting for run to complete in thread: ${threadId}`);
    for await (const event of runStream) {
        if (event.data.status === 'completed') {
            console.log(`Run successfully completed in thread ${threadId}`);
            break;
        }
        else if (event.data.status === 'failed') {
            console.log(`A Run error occured in thread ${threadId}, Error Code: ${event.data.last_error.code} Message: ${event.data.last_error.message}`);
            return "Sorry, something went wrong, please try again.";
        }
        else if (event.data.status === 'requires_action') {
            console.log(`Tool call got picked up in thread ${threadId}`);

            for (const toolCall of event.data.required_action.submit_tool_outputs.tool_calls) {
                if (toolCall.function.name === "createLead") {
                    const arguments = JSON.parse(toolCall.function.arguments);
                    const output = await crm.createLead({
                        company: arguments.project,
                        contactPerson: arguments.name,
                        notes: arguments.description,
                        email: arguments.email,
                        phoneNumber: arguments.phone
                    });

                    const toolStream = await openAiClient.beta.threads.runs.submitToolOutputs(threadId, event.data.id, {
                        tool_outputs: [{
                            tool_call_id: toolCall.id,
                            output: JSON.stringify(arguments)
                        }],
                        stream: true
                    });

                    // Wait for the stream to complete, then the run is complete and a response has been generated.
                    for await (const toolEvent of toolStream) {
                    }
                }
            }
        }
    }

    activeRuns.delete(threadId); // Mark the thread as no longer having an active run.

    // Get the latest message in the thread, which will be the assistants response.
    const threadMessages = await openAiClient.beta.threads.messages.list(threadId, {
        order: "desc",
        limit: 1
    });
    const response = threadMessages.data[0].content[0].text.value;
  
    console.log(`Assistant response in thread ${threadId}: ${response}`);
    return response;
}

// To avoid creating a new assistant every time the app starts. Save its ID to a file, then retrieve the ID each time the app starts.
// A new assistant will automatically be created if the assistant name, instructions or model is changed.
// If any changes are made to the knowledge.docx file or the assistant tools, the 'existing_assistant.json' file needs to be manually deleted. So a new assistant can be created.
async function createAssistant() {
    console.log("Creating assistant...");
    const existingAssistantPath = path.resolve(__dirname, '../existing_assistant.json');;

    const assistentConfigInfo = {
        name: process.env.CHATBOT_NAME,
        instructions: assistantInstructions.trim(),
        model: process.env.OPENAI_MODEL
    };
    const configHash = crypto.createHash('md5').update(JSON.stringify(assistentConfigInfo)).digest('hex');

    // Try load existing assistant info from file.
    if (fs.existsSync(existingAssistantPath)) {
        const existingAssistant = require(existingAssistantPath);
        if (existingAssistant.configHash === configHash) {
            console.log(`Loaded existing assistant with model ${existingAssistant.model}.`);
            return existingAssistant.id;
        }

        console.log("Found an existing assistant, but some configurations has changed.");
    }
    
    console.log("Creating a new assistant...");

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
        name: assistentConfigInfo.name,
        instructions: assistentConfigInfo.instructions,
        model: assistentConfigInfo.model,
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
                            "description": "Brief description of the SaaS and the conversation."
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

    await fs.writeFile(existingAssistantPath, JSON.stringify({ id: assistant.id, model: assistant.model, configHash: configHash }), (error) => {});
    console.log(`Created a new assistant with model ${assistant.model}.`);

    return assistant.id;
}

module.exports = {
    init,
    chat,
    startNewThread,
    createAssistant
};