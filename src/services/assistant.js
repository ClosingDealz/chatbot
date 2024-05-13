const fs = require('node:fs');
const crypto = require('crypto');
const path = require('path');
const { OpenAI } = require('openai');
const configuration = require("../configuration");

const openAiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

let assistantId = null;
async function init() {
    console.log("Initializing the assistant...");
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
            console.log(`A Run error occurred in thread ${threadId}, Error Code: ${event.data.last_error.code} Message: ${event.data.last_error.message}`);
            return "Sorry, something went wrong, please try again.";
        }
        else if (event.data.status === 'requires_action') {
            console.log(`Tool call got picked up in thread ${threadId}`);

            for (const toolCall of event.data.required_action.submit_tool_outputs.tool_calls) {
                const functionHandler = configuration.functionHandlers[toolCall.function.name];
                if (!functionHandler) {
                    console.log(`No function handler has been configured for function '${toolCall.function.name}'`);
                    continue;
                }
                
                // Get the messages up to this point, oldest first.
                const threadMessages = await openAiClient.beta.threads.messages.list(threadId, { order: "asc" });
                const messages = threadMessages.data.map(x => { 
                    return { from: x.role, text: x.content[0].text.value.replace("\n\n", "\n") };
                });
                
                const arguments = JSON.parse(toolCall.function.arguments);
                
                var output = await functionHandler(arguments, messages);

                const toolStream = await openAiClient.beta.threads.runs.submitToolOutputs(threadId, event.data.id, {
                    tool_outputs: [{
                        tool_call_id: toolCall.id,
                        output: JSON.stringify(arguments)
                    }],
                    stream: true
                });

                // Wait for the stream to complete, then the run has completed and a response has been generated.
                for await (const toolEvent of toolStream) {
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
// A new assistant will automatically be created if the assistant name, instructions, model, knowledge.docx file, tools, temperature or top_p is changed.
// Force a new assistant to be created by deleting the 'existing_assistant.json' file manually.
async function createAssistant() {
    console.log("Creating assistant...");
    const existingAssistantPath = path.resolve(__dirname, '../existing_assistant.json');;

    const assistantConfigInfo = {
        name: process.env.CHATBOT_NAME,
        instructions: configuration.assistantInstructions.trim(),
        model: process.env.OPENAI_MODEL || "gpt-4-turbo",
        functions: JSON.stringify(configuration.functions),
        temperature: Number(process.env.OPENAI_TEMPERATURE || 1),
        top_p: Number(process.env.OPENAI_TOP_P || 1)
    };

    const configHash = crypto.createHash('md5').update(JSON.stringify(assistantConfigInfo)).digest('hex');
    const fileBuffer = fs.readFileSync('./knowledge.docx');
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    let storeId = null;
    
    // Try load existing assistant info from file.
    if (fs.existsSync(existingAssistantPath)) {
        const existingAssistant = require(existingAssistantPath);
        if (existingAssistant.configHash === configHash && existingAssistant.fileHash === fileHash) {
            console.log(`Loaded existing assistant with model ${existingAssistant.model}.`);
            return existingAssistant.id;
        }
        
        if (existingAssistant.fileHash === fileHash) {
            storeId = existingAssistant.storeId;
        }
        
        console.log("Found an existing assistant, but some configurations has changed.");
    }
    
    console.log("Creating a new assistant...");
    
    // Don't upload the knowledge base if it wasn't changed.
    if (!storeId) {
        const knowledgeDocument = await fs.createReadStream("./knowledge.docx");
        const fileResponse = await openAiClient.files.create({
            file: knowledgeDocument,
            purpose: 'assistants',
        });
        
        const vectorStore = await openAiClient.beta.vectorStores.create({
            name: "Knowledge",
            file_ids: [fileResponse.id]
        });

        storeId = vectorStore.id;
    }

    const functions = configuration.functions.map(func => {
        return {
            "type": "function",
            "function": func
        }
    });

    // See all configurations here: https://platform.openai.com/docs/api-reference/assistants/createAssistant
    const assistant = await openAiClient.beta.assistants.create({
        name: assistantConfigInfo.name,
        instructions: assistantConfigInfo.instructions,
        model: assistantConfigInfo.model,
        temperature: assistantConfigInfo.temperature,
        top_p: assistantConfigInfo.top_p,
        tools: [
          {
            "type": "file_search"
          },
          ...functions
        ],
        tool_resources: { file_search: { vector_store_ids: [storeId] } },
    });

    const assistantData = {
        id: assistant.id,
        model: assistant.model,
        configHash: configHash,
        fileHash: fileHash,
        storeId: storeId
    };
    await fs.writeFile(existingAssistantPath, JSON.stringify(assistantData), (error) => {});
    console.log(`Created a new assistant with model ${assistant.model}.`);

    return assistant.id;
}

module.exports = {
    init,
    chat,
    startNewThread,
    createAssistant
};