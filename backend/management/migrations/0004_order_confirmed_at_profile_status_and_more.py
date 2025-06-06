# Generated by Django 5.1.4 on 2025-04-18 20:47

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('management', '0003_create_deliveries_table'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='confirmed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='profile',
            name='status',
            field=models.CharField(choices=[('Active', 'Active'), ('Deactivated', 'Deactivated'), ('Deleted', 'Deleted')], default='Active', max_length=20),
        ),
        migrations.AlterField(
            model_name='delivery',
            name='order',
            field=models.OneToOneField(db_column='order_id', on_delete=django.db.models.deletion.CASCADE, related_name='delivery', to='management.order'),
        ),
        migrations.AlterField(
            model_name='order',
            name='status',
            field=models.CharField(choices=[('Pending', 'Pending'), ('Order Confirmed', 'Order Confirmed'), ('Cancelled', 'Cancelled')], default='Pending', max_length=50),
        ),
    ]
