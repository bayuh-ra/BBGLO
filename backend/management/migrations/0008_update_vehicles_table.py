from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('management', '0007_create_vehicles_table'),
    ]

    operations = [
        migrations.RunSQL(
            """
            -- Add check constraints for vehicle status and type
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vehicle_status_check') THEN
                    ALTER TABLE vehicles
                    ADD CONSTRAINT vehicle_status_check
                    CHECK (status IN ('Active', 'Under Maintenance', 'Retired'));
                END IF;
            END $$;

            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vehicle_type_check') THEN
                    ALTER TABLE vehicles
                    ADD CONSTRAINT vehicle_type_check
                    CHECK (type IN ('Van', 'Truck', 'Motorcycle'));
                END IF;
            END $$;

            -- Add check constraint for year_manufactured
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'year_manufactured_check') THEN
                    ALTER TABLE vehicles
                    ADD CONSTRAINT year_manufactured_check
                    CHECK (year_manufactured >= 1900 AND year_manufactured <= EXTRACT(YEAR FROM CURRENT_DATE));
                END IF;
            END $$;

            -- Add check constraint for dates
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'date_checks') THEN
                    ALTER TABLE vehicles
                    ADD CONSTRAINT date_checks
                    CHECK (
                        date_acquired <= CURRENT_DATE AND
                        (last_maintenance IS NULL OR last_maintenance <= CURRENT_DATE) AND
                        insurance_expiry > date_acquired AND
                        registration_expiry > date_acquired
                    );
                END IF;
            END $$;

            -- Create index for common queries
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_vehicles_status') THEN
                    CREATE INDEX idx_vehicles_status ON vehicles(status);
                END IF;
            END $$;

            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_vehicles_type') THEN
                    CREATE INDEX idx_vehicles_type ON vehicles(type);
                END IF;
            END $$;

            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_vehicles_assigned_driver') THEN
                    CREATE INDEX idx_vehicles_assigned_driver ON vehicles(assigned_driver);
                END IF;
            END $$;

            -- Update the RLS policy to also allow drivers to view their assigned vehicles
            DROP POLICY IF EXISTS "Allow full access to admin users" ON vehicles;
            
            CREATE POLICY "Allow full access to admin users" ON vehicles
                FOR ALL
                TO authenticated
                USING (
                    EXISTS (
                        SELECT 1 FROM staff_profiles
                        WHERE id = auth.uid()
                        AND role = 'admin'
                        AND status = 'Active'
                    )
                );

            CREATE POLICY "Allow drivers to view their assigned vehicles" ON vehicles
                FOR SELECT
                TO authenticated
                USING (
                    EXISTS (
                        SELECT 1 FROM staff_profiles
                        WHERE id = auth.uid()
                        AND role = 'Driver'
                        AND status = 'Active'
                        AND id = vehicles.assigned_driver
                    )
                );
            """,
            reverse_sql="""
            -- Remove check constraints
            ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicle_status_check;
            ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicle_type_check;
            ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS year_manufactured_check;
            ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS date_checks;

            -- Remove indexes
            DROP INDEX IF EXISTS idx_vehicles_status;
            DROP INDEX IF EXISTS idx_vehicles_type;
            DROP INDEX IF EXISTS idx_vehicles_assigned_driver;

            -- Remove the driver policy
            DROP POLICY IF EXISTS "Allow drivers to view their assigned vehicles" ON vehicles;
            """
        ),
    ] 