from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('management', '0006_alter_expenses_id'),
    ]

    operations = [
        migrations.RunSQL(
            """
            -- Create sequence for vehicle IDs
            CREATE SEQUENCE IF NOT EXISTS vehicle_id_seq;

            -- Create function to generate vehicle IDs
            CREATE OR REPLACE FUNCTION generate_vehicle_id()
            RETURNS text
            LANGUAGE plpgsql
            AS $$
            DECLARE
                next_id INTEGER;
            BEGIN
                -- Get the next value from the sequence
                SELECT nextval('vehicle_id_seq') INTO next_id;
                -- Return formatted ID
                RETURN 'VIN-' || LPAD(next_id::text, 3, '0');
            END;
            $$;

            -- Create vehicles table
            CREATE TABLE vehicles (
                vehicle_id TEXT PRIMARY KEY DEFAULT generate_vehicle_id(),
                plate_number VARCHAR(20) UNIQUE NOT NULL,
                model VARCHAR(100) NOT NULL,
                brand VARCHAR(100) NOT NULL,
                year_manufactured INTEGER NOT NULL,
                type VARCHAR(20) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'Active',
                date_acquired DATE NOT NULL,
                assigned_driver UUID REFERENCES staff_profiles(id),
                last_maintenance DATE,
                insurance_expiry DATE NOT NULL,
                registration_expiry DATE NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_by UUID REFERENCES staff_profiles(id)
            );

            -- Enable RLS
            ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

            -- Create policy for admin users
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

            -- Create trigger for updating updated_at
            CREATE OR REPLACE FUNCTION update_vehicles_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';

            CREATE TRIGGER update_vehicles_updated_at
                BEFORE UPDATE ON vehicles
                FOR EACH ROW
                EXECUTE FUNCTION update_vehicles_updated_at();
            """,
            reverse_sql="""
            DROP TABLE IF EXISTS vehicles;
            DROP FUNCTION IF EXISTS generate_vehicle_id();
            DROP SEQUENCE IF EXISTS vehicle_id_seq;
            DROP FUNCTION IF EXISTS update_vehicles_updated_at();
            """
        ),
    ] 