CREATE TYPE "public"."application_status" AS ENUM('saved', 'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."work_mode" AS ENUM('remote', 'hybrid', 'onsite');--> statement-breakpoint
CREATE TABLE "job_application_tags" (
	"job_application_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "job_application_tags_job_application_id_tag_id_pk" PRIMARY KEY("job_application_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "job_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"role_title" varchar(255) NOT NULL,
	"job_url" varchar(2048),
	"job_description" text,
	"status" "application_status" DEFAULT 'saved' NOT NULL,
	"salary_min" integer,
	"salary_max" integer,
	"salary_currency" varchar(10) DEFAULT 'USD',
	"location" varchar(255),
	"work_mode" "work_mode",
	"notes" text,
	"applied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" varchar(7),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_user_id_name_unique" UNIQUE("user_id","name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "job_application_tags" ADD CONSTRAINT "job_application_tags_job_application_id_job_applications_id_fk" FOREIGN KEY ("job_application_id") REFERENCES "public"."job_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_application_tags" ADD CONSTRAINT "job_application_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;