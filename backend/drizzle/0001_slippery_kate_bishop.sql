ALTER TABLE "auth_sessions" ADD COLUMN "csrf_token_hash" text NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_token_hash_unique" UNIQUE("token_hash");