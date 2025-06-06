# Generated by Django 5.1.4 on 2025-04-13 14:07

import django.contrib.auth.models
import django.contrib.auth.validators
import django.core.validators
import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.CreateModel(
            name='InventoryItem',
            fields=[
                ('item_id', models.CharField(editable=False, max_length=10, primary_key=True, serialize=False)),
                ('item_name', models.CharField(max_length=255)),
                ('brand', models.CharField(blank=True, max_length=100, null=True)),
                ('category', models.CharField(max_length=100)),
                ('size', models.CharField(blank=True, max_length=50, null=True)),
                ('quantity', models.IntegerField()),
                ('uom', models.CharField(max_length=50)),
                ('cost_price', models.DecimalField(decimal_places=2, max_digits=10)),
                ('selling_price', models.DecimalField(decimal_places=2, max_digits=10)),
                ('stock_in_date', models.DateTimeField(default=django.utils.timezone.now)),
            ],
        ),
        migrations.CreateModel(
            name='Profile',
            fields=[
                ('id', models.UUIDField(primary_key=True, serialize=False)),
                ('customer_id', models.CharField(blank=True, max_length=20, null=True, unique=True)),
                ('name', models.CharField(max_length=255)),
                ('email', models.EmailField(max_length=254, unique=True)),
                ('contact', models.CharField(max_length=20)),
                ('company', models.CharField(blank=True, max_length=255, null=True)),
                ('shippingAddress', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField()),
            ],
            options={
                'db_table': 'profiles',
                'managed': True,
            },
        ),
        migrations.CreateModel(
            name='PurchaseOrder',
            fields=[
                ('po_id', models.CharField(editable=False, max_length=20, primary_key=True, serialize=False)),
                ('date_ordered', models.DateTimeField(auto_now_add=True)),
                ('expected_delivery', models.DateField(blank=True, null=True)),
                ('date_delivered', models.DateField(blank=True, default=None, null=True)),
                ('status', models.CharField(choices=[('Pending', 'Pending'), ('Approved', 'Approved'), ('Completed', 'Completed'), ('Cancelled', 'Cancelled'), ('Stocked', 'Stocked')], default='Pending', max_length=20)),
                ('remarks', models.TextField(blank=True, null=True)),
                ('total_cost', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
            ],
            options={
                'db_table': 'purchase_orders',
            },
        ),
        migrations.CreateModel(
            name='StaffProfile',
            fields=[
                ('id', models.UUIDField(primary_key=True, serialize=False)),
                ('staff_id', models.CharField(blank=True, max_length=10, null=True, unique=True)),
                ('email', models.EmailField(max_length=254, unique=True)),
                ('username', models.CharField(max_length=255, unique=True)),
                ('name', models.CharField(blank=True, max_length=255, null=True)),
                ('contact', models.CharField(max_length=14, validators=[django.core.validators.RegexValidator(message='Enter a valid Philippine mobile number (e.g. +63 9XXXXXXXXX or 09XXXXXXXXX).', regex='^(?:\\+63 ?9\\d{2} ?\\d{3} ?\\d{4}|09\\d{9})$')])),
                ('address', models.TextField(blank=True, null=True)),
                ('role', models.CharField(blank=True, max_length=100, null=True)),
                ('license_number', models.CharField(blank=True, max_length=100, null=True)),
                ('created_at', models.DateTimeField()),
                ('status', models.CharField(choices=[('Active', 'Active'), ('Deactivated', 'Deactivated'), ('Deleted', 'Deleted')], default='Active', max_length=20)),
            ],
            options={
                'db_table': 'staff_profiles',
                'managed': True,
            },
        ),
        migrations.CreateModel(
            name='Supplier',
            fields=[
                ('supplier_id', models.CharField(editable=False, max_length=10, primary_key=True, serialize=False)),
                ('supplier_name', models.CharField(max_length=255)),
                ('contact_no', models.CharField(max_length=14, validators=[django.core.validators.RegexValidator(message='Enter a valid Philippine mobile number (e.g. +63 9XXXXXXXXX or 09XXXXXXXXX).', regex='^(?:\\+63 ?9\\d{2} ?\\d{3} ?\\d{4}|09\\d{9})$')])),
                ('email', models.EmailField(max_length=254)),
                ('address', models.TextField()),
            ],
            options={
                'db_table': 'management_supplier',
                'managed': True,
            },
        ),
        migrations.CreateModel(
            name='CustomUser',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('password', models.CharField(max_length=128, verbose_name='password')),
                ('last_login', models.DateTimeField(blank=True, null=True, verbose_name='last login')),
                ('is_superuser', models.BooleanField(default=False, help_text='Designates that this user has all permissions without explicitly assigning them.', verbose_name='superuser status')),
                ('username', models.CharField(error_messages={'unique': 'A user with that username already exists.'}, help_text='Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.', max_length=150, unique=True, validators=[django.contrib.auth.validators.UnicodeUsernameValidator()], verbose_name='username')),
                ('first_name', models.CharField(blank=True, max_length=150, verbose_name='first name')),
                ('last_name', models.CharField(blank=True, max_length=150, verbose_name='last name')),
                ('email', models.EmailField(blank=True, max_length=254, verbose_name='email address')),
                ('is_staff', models.BooleanField(default=False, help_text='Designates whether the user can log into this admin site.', verbose_name='staff status')),
                ('is_active', models.BooleanField(default=True, help_text='Designates whether this user should be treated as active. Unselect this instead of deleting accounts.', verbose_name='active')),
                ('date_joined', models.DateTimeField(default=django.utils.timezone.now, verbose_name='date joined')),
                ('role', models.CharField(choices=[('admin', 'Admin'), ('customer', 'Customer')], default='customer', max_length=10)),
                ('groups', models.ManyToManyField(blank=True, related_name='customuser_groups', to='auth.group')),
                ('user_permissions', models.ManyToManyField(blank=True, related_name='customuser_permissions', to='auth.permission')),
            ],
            options={
                'verbose_name': 'user',
                'verbose_name_plural': 'users',
                'abstract': False,
            },
            managers=[
                ('objects', django.contrib.auth.models.UserManager()),
            ],
        ),
        migrations.CreateModel(
            name='PurchaseOrderItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantity', models.PositiveIntegerField()),
                ('uom', models.CharField(max_length=20)),
                ('unit_price', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('total_price', models.DecimalField(decimal_places=2, default=0, editable=False, max_digits=12)),
                ('item', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='purchase_order_items', to='management.inventoryitem')),
                ('po', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='management.purchaseorder')),
            ],
            options={
                'db_table': 'purchaseorder_item',
            },
        ),
        migrations.AddField(
            model_name='purchaseorder',
            name='ordered_by',
            field=models.ForeignKey(blank=True, db_column='ordered_by', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ordered_purchase_orders', to='management.staffprofile'),
        ),
        migrations.CreateModel(
            name='Order',
            fields=[
                ('order_id', models.CharField(editable=False, max_length=100, primary_key=True, serialize=False)),
                ('contact', models.CharField(max_length=14, validators=[django.core.validators.RegexValidator(message='Enter a valid Philippine mobile number (e.g. +63 9XXXXXXXXX or 09XXXXXXXXX).', regex='^(?:\\+63 ?9\\d{2} ?\\d{3} ?\\d{4}|09\\d{9})$')])),
                ('customer_email', models.EmailField(max_length=254)),
                ('customer_name', models.CharField(max_length=255)),
                ('company', models.CharField(max_length=255)),
                ('shipping_address', models.TextField()),
                ('items', models.JSONField()),
                ('total_amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('status', models.CharField(choices=[('Pending', 'Pending'), ('Packed', 'Packed'), ('In Transit', 'In Transit'), ('Delivered', 'Delivered'), ('Cancelled', 'Cancelled')], default='Pending', max_length=50)),
                ('date_ordered', models.DateTimeField(blank=True, null=True)),
                ('packed_at', models.DateTimeField(blank=True, null=True)),
                ('in_transit_at', models.DateTimeField(blank=True, null=True)),
                ('delivered_at', models.DateTimeField(blank=True, null=True)),
                ('placed_by', models.CharField(blank=True, max_length=255, null=True)),
                ('updated_by', models.ForeignKey(blank=True, db_column='updated_by', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='updated_orders', to='management.staffprofile')),
            ],
            options={
                'db_table': 'orders',
                'managed': True,
            },
        ),
        migrations.CreateModel(
            name='Delivery',
            fields=[
                ('delivery_id', models.CharField(max_length=50, primary_key=True, serialize=False, unique=True)),
                ('vehicle', models.CharField(blank=True, max_length=255, null=True)),
                ('delivery_date', models.DateField(blank=True, null=True)),
                ('date_delivered', models.DateField(blank=True, null=True)),
                ('status', models.CharField(choices=[('Pending', 'Pending'), ('Packed', 'Packed'), ('In Transit', 'In Transit'), ('Delivered', 'Delivered')], default='Pending', max_length=20)),
                ('order', models.OneToOneField(db_column='order_id', on_delete=django.db.models.deletion.CASCADE, related_name='delivery', to='management.order')),
                ('driver', models.ForeignKey(blank=True, limit_choices_to={'role': 'Driver'}, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='deliveries', to='management.staffprofile')),
            ],
            options={
                'db_table': 'deliveries',
                'managed': True,
            },
        ),
        migrations.CreateModel(
            name='StockInRecord',
            fields=[
                ('stockin_id', models.CharField(max_length=20, primary_key=True, serialize=False)),
                ('quantity', models.IntegerField()),
                ('uom', models.CharField(max_length=10)),
                ('remarks', models.TextField(blank=True)),
                ('date_stocked', models.DateTimeField(auto_now_add=True)),
                ('item', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='management.inventoryitem')),
                ('purchase_order', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='management.purchaseorder')),
                ('stocked_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='management.staffprofile')),
                ('supplier', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='management.supplier')),
            ],
            options={
                'db_table': 'stockin_records',
                'managed': True,
            },
        ),
        migrations.AddField(
            model_name='purchaseorder',
            name='supplier',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='purchase_orders', to='management.supplier'),
        ),
        migrations.AddField(
            model_name='inventoryitem',
            name='supplier',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='inventory_items', to='management.supplier'),
        ),
    ]
