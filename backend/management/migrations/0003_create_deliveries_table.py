from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('management', '0002_create_deliveries'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            CREATE TABLE IF NOT EXISTS deliveries (
                delivery_id VARCHAR(50) PRIMARY KEY,
                vehicle VARCHAR(255),
                delivery_date DATE,
                date_delivered DATE,
                status VARCHAR(20) DEFAULT 'Pending',
                driver_id UUID REFERENCES staff_profiles(id),
                order_id VARCHAR(100) REFERENCES orders(order_id) UNIQUE
            );
            """,
            reverse_sql="""
            DROP TABLE IF EXISTS deliveries;
            """
        ),
    ] 