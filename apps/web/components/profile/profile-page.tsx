'use client';

import { useState, useEffect, KeyboardEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { UpsertProfileSchema, type UpsertProfile, type Profile } from '@kariro/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent } from '@/components/ui/card';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { X, Info } from 'lucide-react';

function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [inputValue, setInputValue] = useState('');

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setInputValue('');
  }

  function removeTag(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value.length - 1);
    }
  }

  return (
    <div className="min-h-10 flex flex-wrap gap-1.5 rounded-md border border-input bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0">
      {value.map((tag, i) => (
        <Badge key={i} variant="secondary" className="gap-1">
          {tag}
          <button
            type="button"
            onClick={() => removeTag(i)}
            className="ml-0.5 rounded-full hover:bg-muted"
          >
            <X className="size-2.5" />
            <span className="sr-only">Remove {tag}</span>
          </button>
        </Badge>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => addTag(inputValue)}
        placeholder={value.length === 0 ? placeholder : ''}
        className="flex-1 min-w-24 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

export function ProfilePage() {
  const { isLoading: authLoading } = useAuth();
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const form = useForm<UpsertProfile>({
    resolver: zodResolver(UpsertProfileSchema),
    defaultValues: {
      resumeText: '',
      skills: [],
      preferredRoles: [],
      preferredLocations: [],
      salaryExpectationMin: undefined,
      salaryExpectationMax: undefined,
    },
  });

  const { reset } = form;

  useEffect(() => {
    if (authLoading) return;

    void (async () => {
      const res = await apiClient<Profile | null>('/profile');
      if (res.success && res.data) {
        const profile = res.data;
        reset({
          resumeText: profile.resumeText ?? '',
          skills: profile.skills,
          preferredRoles: profile.preferredRoles,
          preferredLocations: profile.preferredLocations,
          salaryExpectationMin: profile.salaryExpectationMin ?? undefined,
          salaryExpectationMax: profile.salaryExpectationMax ?? undefined,
        });
      }
      setIsLoadingProfile(false);
    })();
  }, [authLoading, reset]);

  async function handleSubmit(data: UpsertProfile) {
    const res = await apiClient<Profile>('/profile', {
      method: 'PUT',
      body: data,
    });
    if (!res.success) {
      toast.error(res.error ?? 'Failed to save profile');
      return;
    }
    toast.success('Profile saved');
  }

  if (isLoadingProfile) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="h-8 w-32 rounded bg-muted animate-pulse" />
        <div className="h-64 rounded bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your profile is used by AI features to personalize results.
        </p>
      </div>

      {/* Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="flex items-start gap-2 pt-4 text-sm text-blue-800">
          <Info className="size-4 shrink-0 mt-0.5" />
          <span>
            Keep your profile up to date for better AI-powered cover letters, interview prep, and resume gap analysis.
          </span>
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Resume */}
          <FormField
            control={form.control}
            name="resumeText"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Resume Text</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Paste your resume text here…"
                    rows={10}
                    className="font-mono text-xs"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Skills */}
          <FormField
            control={form.control}
            name="skills"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Skills</FormLabel>
                <FormControl>
                  <TagInput
                    value={field.value ?? []}
                    onChange={field.onChange}
                    placeholder="Type a skill and press Enter…"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Preferred Roles */}
          <FormField
            control={form.control}
            name="preferredRoles"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred Roles</FormLabel>
                <FormControl>
                  <TagInput
                    value={field.value ?? []}
                    onChange={field.onChange}
                    placeholder="e.g. Software Engineer, Product Manager…"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Preferred Locations */}
          <FormField
            control={form.control}
            name="preferredLocations"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred Locations</FormLabel>
                <FormControl>
                  <TagInput
                    value={field.value ?? []}
                    onChange={field.onChange}
                    placeholder="e.g. Remote, New York, London…"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Salary Expectations */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="salaryExpectationMin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Min Salary (USD)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="80000"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="salaryExpectationMax"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Salary (USD)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="150000"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving…' : 'Save Profile'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
