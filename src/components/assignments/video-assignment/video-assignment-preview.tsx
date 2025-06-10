"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface VideoAssignmentPreviewProps {
  topic: string;
  videoUrl: string;
  questions: { text: string; answer: string; }[];
}

function getYouTubeVideoId(url: string) {
  let videoId = '';
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'youtu.be') {
      videoId = urlObj.pathname.slice(1);
    } else if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') {
      videoId = urlObj.searchParams.get('v') || '';
    }
  } catch (e) {
    console.error("Invalid URL for YouTube video");
    return null;
  }
  return videoId;
}


export function VideoAssignmentPreview({ topic, videoUrl, questions }: VideoAssignmentPreviewProps) {
  const videoId = getYouTubeVideoId(videoUrl);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{topic}</CardTitle>
          <CardDescription>Watch the video below and answer the questions.</CardDescription>
        </CardHeader>
        <CardContent>
          {videoId ? (
            <AspectRatio ratio={16 / 9}>
              <iframe
                className="rounded-lg w-full h-full"
                src={`https://www.youtube.com/embed/${videoId}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </AspectRatio>
          ) : (
            <p className="text-red-500">Invalid YouTube URL provided.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
            <CardTitle>Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            {questions.map((q, index) => (
                <div key={index} className="p-4 border rounded-md">
                    <p className="font-semibold">Question {index + 1}: {q.text}</p>
                    <p className="text-sm text-muted-foreground mt-2">Your answer will be recorded here.</p>
                </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
} 