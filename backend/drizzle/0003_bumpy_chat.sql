CREATE TABLE "transaction_purge_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"purged_transaction_id" uuid NOT NULL,
	"deleted_at" timestamp with time zone NOT NULL,
	"purged_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" text
);
--> statement-breakpoint
ALTER TABLE "transaction_purge_logs" ADD CONSTRAINT "transaction_purge_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transactions_owner_date_idx" ON "transactions" USING btree ("user_id","occurred_on","occurred_at_local_time");--> statement-breakpoint
CREATE INDEX "transactions_owner_pocket_idx" ON "transactions" USING btree ("user_id","pocket_id") WHERE "transactions"."pocket_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "transactions_owner_transfer_pockets_idx" ON "transactions" USING btree ("user_id","from_pocket_id","to_pocket_id") WHERE "transactions"."type" = 'transfer';--> statement-breakpoint
CREATE INDEX "transactions_owner_category_idx" ON "transactions" USING btree ("user_id","category_id") WHERE "transactions"."category_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "transactions_owner_state_idx" ON "transactions" USING btree ("user_id","deleted_at","archived_at");