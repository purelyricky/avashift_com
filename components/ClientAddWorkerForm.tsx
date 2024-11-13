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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

// Form validation schema
const formSchema = z.object({
  email: z.string()
    .email("Invalid email address")
    .min(1, "Email is required"),
  role: z.enum(['student', 'shiftLeader', 'gateman', 'client'], {
    required_error: "Role is required",
  }),
  projectId: z.string()
    .min(1, "Project selection is required"),
});

const ClientAddWorkerForm = ({ user, projects, onSubmit }: AddWorkerFormProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Get redirect path based on user role
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
      email: "",
      role: undefined,
      projectId: "",
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      await onSubmit(values);
      
      const redirectPath = getRedirectPath(user.role);
      router.push(redirectPath);
      router.refresh();
    } catch (error) {
      console.error('Error adding worker:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <div className="payment-transfer_form-details">
        <div className="mb-6">
          <h2 className="text-18 font-semibold text-gray-900">
            Add New Worker
          </h2>
          <p className="text-16 font-normal text-gray-600">
            Enter the details of the worker you want to add to a project
          </p>
        </div>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="border-t border-gray-200">
                <div className="payment-transfer_form-item py-5">
                  <FormLabel className="text-14 w-full max-w-[280px] font-medium text-gray-700">
                    Worker Email
                  </FormLabel>
                  <div className="flex w-full flex-col">
                    <FormControl>
                      <Input
                        placeholder="Enter worker's email"
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
            name="role"
            render={({ field }) => (
              <FormItem className="border-t border-gray-200">
                <div className="payment-transfer_form-item py-5">
                  <FormLabel className="text-14 w-full max-w-[280px] font-medium text-gray-700">
                    Role
                  </FormLabel>
                  <div className="flex w-full flex-col">
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="input-class">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="shiftLeader">Shift Leader</SelectItem>
                        <SelectItem value="gateman">Security Guard</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-12 text-gray-600">
                      Select the role of the worker in the project
                    </FormDescription>
                    <FormMessage className="text-12 text-red-500" />
                  </div>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
              <FormItem className="border-t border-gray-200">
                <div className="payment-transfer_form-item py-5">
                  <FormLabel className="text-14 w-full max-w-[280px] font-medium text-gray-700">
                    Project
                  </FormLabel>
                  <div className="flex w-full flex-col">
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="input-class">
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[200px]">
                        {projects.map((project) => (
                          <SelectItem key={project.projectId} value={project.projectId}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-12 text-gray-600">
                      Select the project to add the worker to
                    </FormDescription>
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
                  Adding Worker...
                </>
              ) : (
                "Add Worker"
              )}
            </Button>
          </div>
        </form>
      </div>
    </Form>
  );
};

export default ClientAddWorkerForm;