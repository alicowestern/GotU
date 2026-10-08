'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export async function login(state: unknown, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const result = loginSchema.safeParse({ email, password });
  if (!result.success) {
    return { error: 'Invalid email or password' };
  }

  const supabase = await createClient();
  const { error, data } = await supabase.auth.signInWithPassword({
    email: result.data.email,
    password: result.data.password,
  });

  if (error) {
    return { error: 'Invalid credentials. Please try again.' };
  }

  // Determine redirection based on admin role
  const adminId = process.env.GOTU_ADMIN_USER_ID;
  if (adminId && data.user?.id === adminId) {
    redirect('/admin');
  }

  redirect('/dashboard');
}

export async function register(state: unknown, formData: FormData) {
  const fullName = formData.get('fullName') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  const result = registerSchema.safeParse({ fullName, email, password, confirmPassword });
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const supabase = await createClient();
  
  // Create user
  const { error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: {
      data: {
        full_name: result.data.fullName,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: 'An error occurred during registration. Please try again.' };
  }

  return { success: true, message: 'Check your email to verify your account.' };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  
  redirect('/login');
}

export async function resetPassword(state: unknown, formData: FormData) {
  const email = formData.get('email') as string;
  
  if (!email || !email.includes('@')) {
    return { error: 'Please enter a valid email address' };
  }

  const supabase = await createClient();
  
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  });

  // Generic response to prevent email enumeration
  return { success: true, message: 'If an account exists, a password reset link has been sent.' };
}
export async function updatePassword(state: unknown, formData: FormData) {
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match' };
  }

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: 'Error updating password. The link might have expired.' };
  }

  redirect('/login');
}
