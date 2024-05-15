<div align="center">
  <h1>CDZ - Lead Capture Chatbot</h1>
</div>

![image](https://github.com/ClosingDealz/chatbot/assets/54490104/3656caf1-9f48-4618-8728-236a1d5309dc)

<p align="center">
  Integrate this chatbot seamlessly into your website to engage visitors, capture leads, and streamline your sales process. By automating lead capture, it ensures that no potential customer goes unnoticed. The chatbot interacts with visitors through interactive conversations, effectively transforming your website into a powerful lead generation tool.
</p>

<p align="center">
  <a href="https://github.com/ClosingDealz/chatbot/network/members/">
    <img src="https://img.shields.io/github/forks/ClosingDealz/chatbot?style=flat-square&logo=github" alt="Forks" />
  </a>
  <a href="https://github.com/ClosingDealz/chatbot/stargazers/">
    <img src="https://img.shields.io/github/stars/ClosingDealz/chatbot?style=flat-square&logo=github" alt="Stars" />
  </a>
  <a href="https://github.com/ClosingDealz/chatbot/graphs/contributors">
    <img src="https://img.shields.io/github/contributors/ClosingDealz/chatbot?style=flat-square&logo=github" alt="Contributors" />
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/github/license/ClosingDealz/chatbot?style=flat-square" alt="License" />
  </a>
</p>

## Table of Contents 
- [Usage](#usage)
  - [Quick Installation Guide](#quick-installation-guide)
  - [Getting Started](#getting-started)
  - [Configure Environment Variables](#configure-environment-variables)
    - [Obtaining API Keys](#obtaining-api-keys)
    - [Server Protection Using API Keys](#server-protection-using-api-keys)
  - [Configure the Chatbot](#configure-the-chatbot)
    - [Assistant Knowledge Base](#assistant-knowledge-base)
  - [Starting the Server](#starting-the-server)
    - [Available Endpoints](#available-endpoints)
- [License](#license)


## Usage

### Quick Installation Guide
Clone the repository
```sh
> git clone https://github.com/ClosingDealz/chatbot.git
```
or download it as a [zip-file](https://github.com/ClosingDealz/chatbot/archive/refs/heads/main.zip).

Once cloned/downloaded, navigate to the `src` directory.


### Getting Started
This project requires node version 20 or later. [Download Node.js here](https://nodejs.org/en/download)

Install all npm dependencies.
```sh
> npm install
```


### Configure Environment Variables
Copy the [.env.example](/src/.env.example) file and name it `.env`.
```env
CHATBOT_NAME='chatbot'

CLOSINGDEALZ_API_KEY='your_closingdealz_api_key_here'
OPENAI_API_KEY='your_openai_api_key_here'
OPENAI_MODEL='gpt-4-turbo'

OPENAI_TEMPERATURE=1
OPENAI_TOP_P=1

ENABLE_API_KEY=true
API_KEY='any_random_string_you_want'

HOSTNAME='localhost'
PORT=4069
```
Edit these configurations to suit your needs.

#### Obtaining API Keys
This chatbot requires a ClozingDealz and OpenAI API key to work. Paste your API keys in the `.env` file.

[ClosingDealz](https://closingdealz.io) is used as the CRM tool to store all the leads. Follow [this link to get a ClosingDealz API key](https://docs.closingdealz.io/developers/obtaining-api-key).

OpenAI is used to generate responses for the chatbot. Follow [this link to get an OpenAI API key](https://platform.openai.com/docs/quickstart/account-setup).

*An account has to be created for both of these.*

#### Server Protection Using API Keys
You can protect your server using your own API keys when making requests by setting `ENABLE_API_KEY` to true. A `X-API-Key` header needs to be added to the requests with the value of `API_KEY`.

`API_KEY` can be of any value you'd like, but it's recommended to be a random string or `UUID` thats at least 12 characters long.


### Configure the Chatbot
You can configure the instructions and functions for the assistant in the [configuration.js](src/configuration.js) file.

To avoid creating a new assistant every time the app starts, a `existing_assistant.json` file will be created. This file contains the OpenAI assistant id, and will be reused every time the app starts.

If any changes are made to the assistant, such as **assistant name**, **instructions**, **model**, **knowledge.docx file**, **tools**, **temperature** or **top_p**, a new assistant will be created automatically.

Force a new assistant to be created by deleting the `existing_assistant.json` file manually.

#### Assistant Knowledge Base
The knowledge file for the assistant is located in `src/knowledge.docx`. This file is used to effectively answer queries, replace this document for your needs.


### Starting the Server
Start the server by typing.
```sh
> npm start
```
or
```sh
> node server.js
```

The server should be accessible at: [http://127.0.0.1:4069](http://127.0.0.1:4069)


#### Available Endpoints
`POST /start-thread` is used to start a new thread with the chatbot. A thread id will be returned that can be used to chat in the thread.

`POST /chat` is used to chat with the chatbot. A thread id is required. Example request body:
```json
{
  "threadId": "thread_abc123",
  "message": "Hello!"
}
```

> If `ENABLE_API_KEY` is enabled, a `X-API-Key` header needs to be added when making requests. The value should be whatever was set in `API_KEY`.


## License
This project has been released under the MIT license. More information can be found by viewing the license [here](LICENSE).
