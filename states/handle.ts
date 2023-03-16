import { notifications } from "@mantine/notifications";
import { addChatInput, ChatInput, chatState } from "./chatState";
import { getVoiceOutput } from "./elevenLabs";

type EndpointError = {
  error: string;
  message: string
}
type EndpointOutput = {
  message: string;
} | EndpointError

type ChatResponse = ChatInput | EndpointError

export const onRecordingStop = async (blobs: Blob[]) => {
  const formData = new FormData();
  const blob = new Blob(blobs, { type: "audio/mpeg;" });
  formData.append("file", blob);

  let transcript: EndpointOutput;
  try {
    transcript = await fetch('/api/whisper', {
      method: 'POST',
      body: formData
    }).then(res => res.json());
    if ('error' in transcript) {
      throw new Error(transcript.message)
    }
  } catch (e) {
    return notifications.show({
      title: "Ups!",
      message:
        "I couldn't understand you, please try again",
      color: "red",
    });
  }
  const answer = await getAnswer(transcript.message);

  if (!answer) return;

  try {
    const voice = await getVoiceOutput(answer.content);
    // @ts-ignore
    const audioUrl = URL.createObjectURL(new Blob([new Uint8Array(voice)]));
    const audio = new Audio(audioUrl);

    chatState.value = chatState.value.map((chat) => {
      if (chat.id === answer.id) {
        return {
          ...chat,
          audio
        }
      }
      return chat
    })

    audio.play();

  } catch (e) {
    return notifications.show({
      title: "Ups!",
      message:
        "I couldn't talk right now, please try again",
      color: "red",
    });
  }
}

export const getAnswer = async (message: string) => {
  const userInput = addChatInput({
    // @ts-ignore
    role: "user",
    content: message,
  })

  let answer: ChatResponse;
  let aiInput: ChatInput;
  try {
    answer = await fetch('/api/answer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chatInput: chatState.peek(),
        chatroom: 'Explanation'
      })
    }).then(res => res.json());
    if ('error' in answer) {
      throw new Error(answer.message)
    }
    aiInput = await addChatInput(answer);
    return aiInput;
  } catch (e) {
    return notifications.show({
      title: "Ups!",
      message:
        "I couldn't find an answer for you, please try again",
      color: "red",
    });
  }
}