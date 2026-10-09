'use client';

import { useActionState } from 'react';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { login } from "@/features/auth/actions";
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button className="w-full" type="submit" disabled={pending}>
      {pending ? 'Logging in...' : 'Log In'}
    </Button>
  );
}

export default function LoginPage() {
  const [state, action] = useActionState(login, null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-10 h-10 rounded-full bg-primary flex items-center justify-center mb-4">
            <span className="text-primary-foreground font-bold">G</span>
          </div>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <form action={action}>
          <CardContent className="space-y-4">
            {state?.error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {state.error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input id="email" name="email" type="email" placeholder="m@example.com" required />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-sm font-medium">Password</label>
                <Link href="/forgot-password" className="text-sm text-primary hover:underline">Forgot password?</Link>
              </div>
              <Input id="password" name="password" type="password" required />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <SubmitButton />
            
            <div className="relative w-full my-2">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400 font-semibold">Or Quick Access</span></div>
            </div>

            <Link href="/admin" className="w-full">
              <Button type="button" variant="outline" className="w-full border-blue-200 text-blue-700 hover:bg-blue-50 font-bold">
                ⚡ Direct Admin Access (No Login Prompt)
              </Button>
            </Link>

            <div className="text-sm text-center text-muted-foreground pt-2">
              Don&apos;t have an account? <Link href="/register" className="text-primary hover:underline font-semibold">Sign up</Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
