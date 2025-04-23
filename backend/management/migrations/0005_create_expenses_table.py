import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('management', '0004_order_confirmed_at_profile_status_and_more'),
    ]

    operations = [
        migrations.RunSQL(
            # Only create the table if it doesn't exist
            sql="""
            CREATE TABLE IF NOT EXISTS expenses (
                expense_id VARCHAR(10) PRIMARY KEY,
                category VARCHAR(255) NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                date DATE NOT NULL,
                paid_to VARCHAR(255) NOT NULL,
                description TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                created_by UUID REFERENCES staff_profiles(id)
            );
            """,
            # No reverse SQL needed since we're using IF NOT EXISTS
            reverse_sql=""
        ),
    ] 