import { component$, useSignal, useVisibleTask$, $ } from "@builder.io/qwik";
import { transcribeAudio } from "../services/apiClient";

interface AudioRecorderProps {
  sessionId: string;
  isRecording: boolean;
  onTranscriptionChunk$: (chunk: any) => void;
  onError$: (error: string) => void;
}

export const AudioRecorder = component$<AudioRecorderProps>((props) => {
  const mediaRecorder = useSignal<MediaRecorder | null>(null);
  const stream = useSignal<MediaStream | null>(null);
  const chunkIndex = useSignal<number>(0);
  const isProcessing = useSignal<boolean>(false);

  // Start recording
  const startRecording = $(async () => {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.value = audioStream;
      const recorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm' });
      mediaRecorder.value = recorder;

      recorder.ondataavailable = async (e) => {
        if (e.data.size > 0 && props.sessionId) {
          isProcessing.value = true;
          try {
            const chunk = await transcribeAudio(props.sessionId, e.data, chunkIndex.value);
            props.onTranscriptionChunk$(chunk);
            chunkIndex.value++;
          } catch (error: any) {
            props.onError$(error.message || 'Transcription failed');
          } finally {
            isProcessing.value = false;
          }
        }
      };

      // Record in 10-second chunks for lower latency
      recorder.start(10000);
    } catch (err: any) {
      props.onError$('Microphone access denied or error occurred.');
    }
  });

  // Stop recording
  const stopRecording = $(() => {
    if (mediaRecorder.value && mediaRecorder.value.state !== 'inactive') {
      mediaRecorder.value.stop();
    }
    if (stream.value) {
      stream.value.getTracks().forEach(track => track.stop());
    }
  });

  useVisibleTask$(({ track }) => {
    track(() => props.isRecording);
    if (props.isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
    
    return () => stopRecording();
  });

  return (
    <div class="flex items-center gap-3">
      {props.isRecording && (
        <div class="flex items-center gap-2 text-sm font-medium text-danger">
          <div class="w-3 h-3 rounded-full bg-danger recording-pulse"></div>
          Recording live...
        </div>
      )}
      {isProcessing.value && (
        <div class="text-xs text-text-muted flex items-center gap-1">
           <svg class="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing audio
        </div>
      )}
    </div>
  );
});
