from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('management', '0001_initial'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            ALTER TABLE IF EXISTS stockin_record RENAME TO stockin_records;
            """,
            reverse_sql="""
            ALTER TABLE IF EXISTS stockin_records RENAME TO stockin_record;
            """
        ),
    ] 