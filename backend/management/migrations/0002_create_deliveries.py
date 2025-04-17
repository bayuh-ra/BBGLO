import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('management', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Delivery',
            fields=[
                ('delivery_id', models.CharField(max_length=50, primary_key=True, serialize=False, unique=True)),
                ('vehicle', models.CharField(blank=True, max_length=255, null=True)),
                ('delivery_date', models.DateField(blank=True, null=True)),
                ('date_delivered', models.DateField(blank=True, null=True)),
                ('status', models.CharField(choices=[('Pending', 'Pending'), ('Packed', 'Packed'), ('In Transit', 'In Transit'), ('Delivered', 'Delivered')], default='Pending', max_length=20)),
                ('driver', models.ForeignKey(blank=True, limit_choices_to={'role': 'Driver'}, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='deliveries', to='management.staffprofile')),
                ('order', models.OneToOneField(db_column='order_id', on_delete=django.db.models.deletion.CASCADE, related_name='delivery', to='management.order', to_field='order_id')),
            ],
            options={
                'db_table': 'deliveries',
                'managed': True,
            },
        ),
    ] 