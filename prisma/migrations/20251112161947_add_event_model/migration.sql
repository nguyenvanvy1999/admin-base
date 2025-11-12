-- AlterTable
ALTER TABLE "investment_contributions" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "investment_trades" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "investment_valuations" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "event_id" TEXT;

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_userId_idx" ON "events"("user_id");

-- CreateIndex
CREATE INDEX "event_name_idx" ON "events"("name");

-- CreateIndex
CREATE INDEX "event_startAt_idx" ON "events"("start_at");

-- CreateIndex
CREATE INDEX "event_endAt_idx" ON "events"("end_at");

-- CreateIndex
CREATE UNIQUE INDEX "events_user_id_name_key" ON "events"("user_id", "name");

-- CreateIndex
CREATE INDEX "transaction_eventId_idx" ON "transactions"("event_id");

-- Migrate data from metadata.tripEvent to Event model
DO $$
DECLARE
    trip_event_record RECORD;
    event_id_val TEXT;
    event_start_date TIMESTAMP(3);
BEGIN
    -- Loop through unique tripEvent values per user
    FOR trip_event_record IN
        SELECT DISTINCT
            t.user_id,
            t.metadata->>'tripEvent' as trip_event_name
        FROM transactions t
        WHERE t.metadata IS NOT NULL
          AND t.metadata->>'tripEvent' IS NOT NULL
          AND t.metadata->>'tripEvent' != ''
          AND t.deleted_at IS NULL
    LOOP
        -- Generate UUID v7 for event (using gen_random_uuid() as fallback)
        event_id_val := gen_random_uuid()::TEXT;
        
        -- Use transaction date as startAt, or current timestamp if not available
        SELECT MIN(t.date) INTO event_start_date
        FROM transactions t
        WHERE t.user_id = trip_event_record.user_id
          AND t.metadata->>'tripEvent' = trip_event_record.trip_event_name
          AND t.deleted_at IS NULL;
        
        IF event_start_date IS NULL THEN
            event_start_date := NOW();
        END IF;
        
        -- Create Event
        INSERT INTO events (id, user_id, name, start_at, end_at, created_at, updated_at)
        VALUES (
            event_id_val,
            trip_event_record.user_id,
            trip_event_record.trip_event_name,
            event_start_date,
            NULL,
            NOW(),
            NOW()
        )
        ON CONFLICT (user_id, name) DO NOTHING;
        
        -- Get the event ID (handle conflict case)
        SELECT id INTO event_id_val
        FROM events
        WHERE user_id = trip_event_record.user_id
          AND name = trip_event_record.trip_event_name
        LIMIT 1;
        
        -- Update transactions with event_id
        UPDATE transactions
        SET event_id = event_id_val
        WHERE user_id = trip_event_record.user_id
          AND metadata->>'tripEvent' = trip_event_record.trip_event_name
          AND deleted_at IS NULL
          AND event_id IS NULL;
    END LOOP;
END $$;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
