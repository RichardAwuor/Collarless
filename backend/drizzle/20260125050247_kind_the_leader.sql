CREATE TABLE "mpesa_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"merchant_request_id" text NOT NULL,
	"checkout_request_id" text NOT NULL,
	"phone_number" text NOT NULL,
	"amount" integer DEFAULT 130 NOT NULL,
	"mpesa_receipt_number" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"result_desc" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mpesa_transactions_checkout_request_id_unique" UNIQUE("checkout_request_id")
);
--> statement-breakpoint
ALTER TABLE "mpesa_transactions" ADD CONSTRAINT "mpesa_transactions_provider_id_service_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."service_providers"("id") ON DELETE cascade ON UPDATE no action;