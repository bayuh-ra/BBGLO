from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('management', '0005_create_expenses_table'),
    ]

    operations = [
        migrations.RunSQL(
            # Create sequence for expense IDs
            """
            -- First, create a sequence for the expense IDs
            CREATE SEQUENCE IF NOT EXISTS expense_id_seq;

            -- Create function to generate expense IDs
            CREATE OR REPLACE FUNCTION generate_expense_id()
            RETURNS text
            LANGUAGE plpgsql
            AS $$
            DECLARE
                next_id INTEGER;
            BEGIN
                -- Get the next value from the sequence
                SELECT nextval('expense_id_seq') INTO next_id;
                -- Return formatted ID
                RETURN 'EXP-' || LPAD(next_id::text, 3, '0');
            END;
            $$;

            -- Create a temporary table to store existing data
            CREATE TEMP TABLE temp_expenses AS SELECT * FROM expenses;

            -- Drop the existing table
            DROP TABLE expenses;

            -- Recreate the expenses table with the new ID format
            CREATE TABLE expenses (
                expense_id TEXT PRIMARY KEY DEFAULT generate_expense_id(),
                category VARCHAR(255) NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                date DATE NOT NULL,
                paid_to VARCHAR(255) NOT NULL,
                description TEXT,
                created_by UUID REFERENCES staff_profiles(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Enable RLS
            ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

            -- Create policy for admin users
            CREATE POLICY "Allow full access to admin users" ON expenses
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
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';

            CREATE TRIGGER update_expenses_updated_at
                BEFORE UPDATE ON expenses
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();

            -- Reinsert the data from the temporary table with new IDs
            INSERT INTO expenses (
                category,
                amount,
                date,
                paid_to,
                description,
                created_by,
                created_at,
                updated_at
            )
            SELECT 
                category,
                amount,
                date,
                paid_to,
                description,
                created_by,
                created_at,
                updated_at
            FROM temp_expenses;

            -- Drop the temporary table
            DROP TABLE temp_expenses;
            """,
            reverse_sql="""
            -- If needed to reverse, we would recreate the table with UUID
            CREATE TABLE IF NOT EXISTS expenses (
                expense_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                category VARCHAR(255) NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                date DATE NOT NULL,
                paid_to VARCHAR(255) NOT NULL,
                description TEXT,
                created_by UUID REFERENCES staff_profiles(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """
        ),
    ] 