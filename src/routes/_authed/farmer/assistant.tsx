import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { AudioLines, Square, Volume2 } from "lucide-react";
import { toast } from "sonner";

import mitra from "@/assets/mitra.png";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Screen } from "@/components/screen";
import { VoiceMode } from "@/components/voice-mode";
import { useVoiceConversation } from "@/hooks/use-voice-conversation";
import { getAccessToken, useProfile } from "@/lib/auth";
import { speak } from "@/lib/voice/voice-api";

export const Route = createFileRoute("/_authed/farmer/assistant")({
  validateSearch: (search: Record<string, unknown>): { voice?: boolean } =>
    search.voice === true || search.voice === "true" ? { voice: true } : {},
  head: () => ({
    meta: [
      { title: "KAD Mitra — AI farming expert" },
      {
        name: "description",
        content: "Ask natural farming questions by voice or text in Telugu, Hindi or English.",
      },
      { property: "og:title", content: "KAD Mitra — AI farming expert" },
      { property: "og:description", content: "Your natural farming expert that talks in your language." },
    ],
  }),
  component: AssistantPage,
});

const SUGGESTIONS = [
  "బీజామృతం ఎలా తయారు చేయాలి?",
  "My paddy leaves are turning yellow",
  "When should I spray Neemastram?",
  "Explain my soil test result",
];

function textOf(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function AssistantPage() {
  const profile = useProfile();
  const { voice: startInVoice } = Route.useSearch();
  const navigate = useNavigate();
  const modeRef = useRef<"text" | "voice">("text");
  const firstName = profile.full_name.split(" ")[0];

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: async (): Promise<Record<string, string>> => {
          const token = await getAccessToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
        body: () => ({ mode: modeRef.current }),
      }),
    [],
  );

  // useChat keeps its first callbacks, so route events through refs.
  const onFinishRef = useRef<(message: UIMessage) => void>(() => {});
  const onErrorRef = useRef<() => void>(() => {});

  const { messages, sendMessage, status, stop } = useChat({
    transport,
    onFinish: ({ message, isAbort, isError }) => {
      if (!isAbort && !isError) onFinishRef.current(message);
    },
    onError: (error) => {
      toast.error(error.message || "KAD Mitra couldn't answer. Please try again.");
      onErrorRef.current();
    },
  });

  const voice = useVoiceConversation({
    ask: (text) => {
      modeRef.current = "voice";
      void sendMessage({ text });
    },
  });

  onFinishRef.current = (message) => {
    if (voice.isActive()) void voice.answer(textOf(message));
  };
  onErrorRef.current = voice.recover;

  const busy = status === "submitted" || status === "streaming";
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    modeRef.current = "text";
    void sendMessage({ text: trimmed });
  }

  function openVoice() {
    stop();
    voice.start();
  }

  function closeVoice() {
    voice.stop();
    modeRef.current = "text";
    if (startInVoice) navigate({ to: "/farmer/assistant", search: {}, replace: true });
  }

  useEffect(() => {
    if (startInVoice) voice.start();
    // Only on first open from the home screen mic button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen
      back
      title={
        <span className="flex items-center gap-2">
          <img src={mitra} alt="" width={28} height={28} className="size-7" />
          KAD Mitra
        </span>
      }
      className="flex flex-col px-0"
    >
      <Conversation className="flex-1">
        <ConversationContent className="px-5 pb-6">
          {messages.length === 0 ? (
            <div className="pt-6">
              <h2 className="text-4xl leading-tight font-extrabold">
                <span className="text-gradient-ai">Namaste, {firstName}</span>
              </h2>
              <p className="mt-1 text-2xl font-semibold text-muted-foreground/70">
                How can I help your farm today?
              </p>
              <div className="mt-8 grid grid-cols-2 gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => ask(suggestion)}
                    className="min-h-24 rounded-2xl bg-muted p-4 text-left text-sm font-medium transition-colors hover:bg-secondary"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => {
              const text = textOf(message);
              const isAssistant = message.role === "assistant";
              const finished = !(busy && message.id === lastAssistant?.id);
              return (
                <Message key={message.id} from={message.role}>
                  {isAssistant && (
                    <img src={mitra} alt="" width={24} height={24} className="size-6" />
                  )}
                  <MessageContent className="text-[15px] leading-relaxed">
                    {isAssistant ? <MessageResponse>{text}</MessageResponse> : text}
                  </MessageContent>
                  {isAssistant && finished && text && <ListenAction text={text} />}
                </Message>
              );
            })
          )}
          {status === "submitted" && <Shimmer className="text-sm">Thinking…</Shimmer>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="sticky bottom-0 bg-background px-4 pt-2 pb-safe">
        <PromptInput
          onSubmit={({ text }) => ask(text)}
          className="rounded-[1.75rem] bg-muted [&_[data-slot=input-group]]:rounded-[1.75rem] [&_[data-slot=input-group]]:border-transparent [&_[data-slot=input-group]]:bg-muted"
        >
          <PromptInputTextarea placeholder="Ask KAD Mitra… (Telugu / English)" className="min-h-12 text-[15px]" />
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputButton onClick={openVoice} className="rounded-full" aria-label="Talk">
                <AudioLines className="size-4" />
                Talk
              </PromptInputButton>
            </PromptInputTools>
            <PromptInputSubmit status={status} onStop={stop} className="rounded-full" />
          </PromptInputFooter>
        </PromptInput>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          KAD Mitra can make mistakes. Check important advice with your CRP.
        </p>
      </div>

      {voice.active && (
        <VoiceMode
          state={voice.state}
          level={voice.level}
          heard={voice.heard}
          caption={lastAssistant ? textOf(lastAssistant) : ""}
          onTap={voice.tap}
          onClose={closeVoice}
        />
      )}
    </Screen>
  );
}

/** Reads one answer aloud — handy for farmers who prefer listening. */
function ListenAction({ text }: { text: string }) {
  const [playing, setPlaying] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  async function toggle() {
    if (playing) {
      controllerRef.current?.abort();
      return;
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    setPlaying(true);
    try {
      await speak(text, controller.signal);
    } catch {
      if (!controller.signal.aborted) toast.error("Couldn't play the answer");
    } finally {
      setPlaying(false);
    }
  }

  return (
    <MessageActions>
      <MessageAction label={playing ? "Stop" : "Listen"} onClick={toggle}>
        {playing ? <Square className="size-4" /> : <Volume2 className="size-4" />}
      </MessageAction>
    </MessageActions>
  );
}

