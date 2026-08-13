ALTER TABLE "idempotency_records" ALTER COLUMN "expires_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "pockets" ADD COLUMN "template_key" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "setup_completed_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "pockets_owner_template_key_idx" ON "pockets" USING btree ("user_id","template_key") WHERE "pockets"."template_key" IS NOT NULL;