import { SageMakerLLMContentHandler } from 'langchain/llms/sagemaker_endpoint';

import { ModelAdapterBase } from './base';
import { ChatMode, ContentType, GetPromptArgs } from '../types';

class LightGPTContentHandler implements SageMakerLLMContentHandler {
  contentType = ContentType.APPLICATION_JSON;
  accepts = ContentType.APPLICATION_JSON;

  async transformInput(prompt: string, modelKwargs: Record<string, unknown>) {
    let max_new_tokens = 5;
    if (modelKwargs.mode === ChatMode.Standard) {
      max_new_tokens = 400;
    }

    const payload = {
      inputs: prompt,
      parameters: {
        do_sample: true,
        top_p: 0.8,
        top_k: 50,
        temperature: 0.5,
        repetition_penalty: 1.1,
        max_new_tokens,
      },
    };

    console.log(`Payload: ${JSON.stringify(payload)}`);
    return Buffer.from(JSON.stringify(payload), 'utf-8');
  }

  async transformOutput(output: Uint8Array) {
    const responseJson = JSON.parse(Buffer.from(output).toString('utf-8'));
    console.log(`Response: ${JSON.stringify(responseJson)}`);
    return responseJson[0].generated_text;
  }
}

export class LightGPTAdapter extends ModelAdapterBase {
  getContentHandler() {
    return new LightGPTContentHandler();
  }

  async getPrompt(args: GetPromptArgs) {
    console.log(args);
    const truncated = this.truncateArgs(args, 4000);
    const { prompt } = truncated;
    console.log(truncated);

    const historyString = truncated.history.map((h) => `${h.sender}: ${h.content}`).join('\n');
    const contextString = truncated.contextString.length > 0 ? truncated.contextString : 'No context.';

    let systemPrompt = `You are a helpful AI assistant. The following is a conversation between you (the system) and the user.\n${historyString || 'No history.'}\n\n`;
    systemPrompt += `This is the context for the current request:\n${contextString}\n`;
    systemPrompt += `Write a response that appropriately completes the request based on the context provided and the conversastion history.\n### Instruction:\n${prompt}\n### Response:\n`;

    return systemPrompt;
  }

  async getStopWords() {
    return [];
  }
}
