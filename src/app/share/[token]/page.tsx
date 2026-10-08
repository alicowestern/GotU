"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function RecipientConsentPage() {
  const [duration, setDuration] = useState<number>(30);
  const [sharing, setSharing] = useState<boolean>(false);

  if (sharing) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <span className="text-green-600 text-2xl font-bold">✓</span>
            </div>
            <CardTitle className="text-2xl">Sharing Active</CardTitle>
            <CardDescription>Your location is being shared.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Time remaining: {duration} minutes</p>
          </CardContent>
          <CardFooter>
            <Button variant="destructive" className="w-full" onClick={() => setSharing(false)}>Stop Sharing</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center border-b pb-6">
          <Badge className="mx-auto mb-4" variant="secondary">Location Request</Badge>
          <CardTitle className="text-xl">John Doe wants to see your location</CardTitle>
          <CardDescription className="mt-2">
            Purpose: Meet up at the park
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-2">
            <h3 className="font-medium">How long do you want to share?</h3>
            <div className="grid grid-cols-3 gap-2">
              <Button 
                variant={duration === 15 ? "default" : "outline"} 
                onClick={() => setDuration(15)}
              >
                15 mins
              </Button>
              <Button 
                variant={duration === 30 ? "default" : "outline"} 
                onClick={() => setDuration(30)}
              >
                30 mins
              </Button>
              <Button 
                variant={duration === 60 ? "default" : "outline"} 
                onClick={() => setDuration(60)}
              >
                1 hour
              </Button>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
            <strong>Privacy Note:</strong> Your location is shared only with the requester. 
            The GotU administrator may view active sessions for security purposes. 
            You can stop sharing at any time.
          </div>
        </CardContent>
        <CardFooter className="flex space-x-4">
          <Button variant="outline" className="w-full">Decline</Button>
          <Button className="w-full" onClick={() => setSharing(true)}>Share Location</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
