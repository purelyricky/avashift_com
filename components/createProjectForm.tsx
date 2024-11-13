"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "./ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

// Form validation schema
const formSchema = z.object({
  name: z.string()
    .min(1, "Project name is required")
    .max(255, "Project name cannot exceed 255 characters"),
  description: z.string()
    .max(1000, "Description cannot exceed 1000 characters")
    .optional(),
});

interface CreateProjectFormProps {
  user: User;
  onSubmit: (data: z.infer<typeof formSchema>) => Promise<void>;
}

const CreateProjectForm = ({ user, onSubmit }: CreateProjectFormProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Function to determine redirect path based on user role
  const getRedirectPath = (role: string) => {
    const paths = {
      admin: '/a-projects',
      client: '/c-projects',
    };
    return paths[role as keyof typeof paths] || '/projects';
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      await onSubmit(values);
      
      // Get the appropriate redirect path based on user role
      const redirectPath = getRedirectPath(user.role);
      
      // Navigate and refresh
      router.push(redirectPath);
      router.refresh();
    } catch (error) {
      console.error('Error creating project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <div className="payment-transfer_form-details">
        <div className="mb-6">
          <h2 className="text-18 font-semibold text-gray-900">
            New Project Details
          </h2>
          <p className="text-16 font-normal text-gray-600">
            Enter the details of the new project
          </p>
        </div>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="border-t border-gray-200">
                <div className="payment-transfer_form-item py-5">
                  <FormLabel className="text-14 w-full max-w-[280px] font-medium text-gray-700">
                    Project Name
                  </FormLabel>
                  <div className="flex w-full flex-col">
                    <FormControl>
                      <Input
                        placeholder="Enter project name"
                        className="input-class"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-12 text-red-500" />
                  </div>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="border-t border-gray-200">
                <div className="payment-transfer_form-item pb-6 pt-5">
                  <div className="payment-transfer_form-content">
                    <FormLabel className="text-14 font-medium text-gray-700">
                      Project Description (Optional)
                    </FormLabel>
                    <FormDescription className="text-12 font-normal text-gray-600">
                      Provide additional details about the project
                    </FormDescription>
                  </div>
                  <div className="flex w-full flex-col">
                    <FormControl>
                      <Textarea
                        placeholder="Enter project description"
                        className="input-class"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-12 text-red-500" />
                  </div>
                </div>
              </FormItem>
            )}
          />

          <div className="payment-transfer_btn-box">
            <Button
              type="submit"
              disabled={isLoading}
              className="payment-transfer_btn">
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" /> &nbsp; 
                  Creating...
                </>
              ) : (
                "Create Project"
              )}
            </Button>
          </div>
        </form>
      </div>
    </Form>
  );
};

export default CreateProjectForm;