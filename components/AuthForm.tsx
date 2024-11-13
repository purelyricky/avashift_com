'use client';

import Image from 'next/image'
import Link from 'next/link'
import React, { useState } from 'react'
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import CustomInput from './CustomInput';
import { authFormSchema } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { signIn, signUp } from '@/lib/actions/user.actions';

const roleOptions: Record<string, { title: string, role: UserRole }> = {
  admin: { title: 'Student Manager', role: 'admin' },
  client: { title: 'Employer', role: 'client' },
  shiftLeader: { title: 'Shift Leader', role: 'shiftLeader' },
  gateman: { title: 'Security Guard', role: 'gateman' },
  student: { title: 'Student', role: 'student' },
};

const getDashboardPath = (role: UserRole): string => {
  const dashboardPaths = {
    admin: '/a-dash',
    student: '/s-dash',
    client: '/c-dash',
    shiftLeader: '/l-dash',
    gateman: '/g-dash'
  };
  return dashboardPaths[role] || '/';
};

const AuthForm = ({ type }: { type: string }) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [loadingRole, setLoadingRole] = useState<UserRole | null>(null); // Track which role button is loading
    const [showRoleSelection, setShowRoleSelection] = useState(false);
    const [formData, setFormData] = useState<SignUpFormData | null>(null);
    const [error, setError] = useState<string | null>(null);

  const formSchema = authFormSchema(type);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      ...(type === 'sign-up' && {
        firstName: "",
        lastName: "",
        phone: "",
      }),
    },
  });

  const handleInitialSubmit = async (data: z.infer<typeof formSchema>) => {
    if (type === 'sign-in') {
      setIsLoading(true);
      try {
        const userData = await signIn({
          email: data.email,
          password: data.password,
        });
        
        if (userData && userData.role) {
          const dashboardPath = getDashboardPath(userData.role as UserRole);
          router.push(dashboardPath);
        } else {
          setError('Invalid user data received');
        }
      } catch (error) {
        console.error('Sign in error:', error);
        setError('Failed to sign in. Please check your credentials.');
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(true); // Set loading state for initial signup button
      try {
        setFormData(data as SignUpFormData);
        setShowRoleSelection(true);
      } catch (error) {
        setError('Failed to proceed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleRoleSelect = async (selectedRole: UserRole) => {
    if (!formData) return;
    
    setLoadingRole(selectedRole); // Set which role button is loading
    try {
      await signUp({
        ...formData,
        role: selectedRole,
      });
      router.push('/sign-in');
    } catch (error) {
      console.error('Sign up error:', error);
      setError('Failed to create account. Please try again.');
      setLoadingRole(null); // Reset loading state on error
    }
  };


  return (
    <section className="auth-form">
      <header className='flex flex-col gap-5 md:gap-8'>
        <Link href="/" className="cursor-pointer flex items-center gap-1">
          <Image 
            src="/icons/logo.svg"
            width={40}
            height={40}
            alt="Ava Shift logo"
          />
          <h1 className="text-26 font-ibm-plex-serif font-bold text-black-1">Ava Shift</h1>
        </Link>

        <div className="flex flex-col gap-1 md:gap-3">
          <h1 className="text-24 lg:text-36 font-semibold text-gray-900">
            {showRoleSelection ? 'Choose Your Role' : type === 'sign-in' ? 'Sign In' : 'Sign Up'}
          </h1>
          <p className="text-16 font-normal text-gray-600">
            {showRoleSelection ? 'Please select your role to continue' : 'Please enter your details'}
          </p>
          {error && (
            <p className="text-14 text-red-500 mt-2">{error}</p>
          )}
        </div>
      </header>

      {showRoleSelection ? (
        <div className="flex flex-col gap-4 mt-8">
          {Object.entries(roleOptions).map(([key, { title, role }]) => (
            <Button
              key={key}
              onClick={() => handleRoleSelect(role)}
              disabled={loadingRole !== null} // Disable all buttons when any is loading
              className={`form-btn w-full h-12 ${loadingRole === role ? 'opacity-80' : ''}`}
            >
              {loadingRole === role ? (
                <>
                  <Loader2 size={20} className="animate-spin mr-2" />
                  Loading...
                </>
              ) : title}
            </Button>
          ))}
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleInitialSubmit)} className="space-y-8">
            {type === 'sign-up' && (
              <>
                <div className="flex gap-4">
                  <CustomInput 
                    control={form.control}
                    name="firstName"
                    label="First Name"
                    placeholder="Enter your first name"
                  />
                  <CustomInput
                    control={form.control}
                    name="lastName"
                    label="Last Name"
                    placeholder="Enter your last name"
                  />
                </div>
                <CustomInput
                  control={form.control}
                  name="phone"
                  label="Phone Number"
                  placeholder="Enter your phone number"
                />
              </>
            )}

            <CustomInput
              control={form.control}
              name="email"
              label="Email"
              placeholder="Enter your email"
            />

            <CustomInput
              control={form.control}
              name="password"
              label="Password"
              placeholder="Enter your password"
            />

            <div className="flex flex-col gap-4">
              <Button type="submit" disabled={isLoading} className="form-btn">
                {isLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" /> &nbsp;
                    Loading...
                  </>
                ) : type === 'sign-in' ? 'Sign In' : 'Continue'}
              </Button>
            </div>
          </form>
        </Form>
      )}

      <footer className="flex justify-center gap-1 mt-6">
        <p className="text-14 font-normal text-gray-600">
          {type === 'sign-in' ? "Don't have an account?" : "Already have an account?"}
        </p>
        <Link href={type === 'sign-in' ? '/sign-up' : '/sign-in'} className="form-link">
          {type === 'sign-in' ? 'Sign up' : 'Sign in'}
        </Link>
      </footer>
    </section>
  );
};

export default AuthForm;