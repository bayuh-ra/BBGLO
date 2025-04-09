from datetime import datetime

from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator
from django.db import models
from django.utils.timezone import timezone, now
from django.utils import timezone


# ─── Validators ───
phone_validator = RegexValidator(
    regex=r'^(?:\+63 ?9\d{2} ?\d{3} ?\d{4}|09\d{9})$',
    message="Enter a valid Philippine mobile number (e.g. +63 9XXXXXXXXX or 09XXXXXXXXX)."
)

def format_phone_number(number):
    digits = ''.join(filter(str.isdigit, number))
    if digits.startswith("63"): digits = digits[2:]
    elif digits.startswith("09") or digits.startswith("0"): digits = digits[1:]
    digits = digits[:10]
    return f"+63 {digits[:3]} {digits[3:6]} {digits[6:]}" if len(digits) == 10 else number

# ─── Supplier ───
class Supplier(models.Model):
    supplier_id = models.CharField(max_length=10, primary_key=True, editable=False)
    supplier_name = models.CharField(max_length=255)
    contact_no = models.CharField(max_length=14, validators=[phone_validator])
    email = models.EmailField()
    address = models.TextField()

    def save(self, *args, **kwargs):
        if not self.supplier_id:
            last = Supplier.objects.order_by('-supplier_id').first()
            last_id = int(last.supplier_id[3:]) if last else 0
            self.supplier_id = f"SUI-{last_id + 1:04d}"
        self.contact_no = format_phone_number(self.contact_no)
        super().save(*args, **kwargs)

    def __str__(self): return self.supplier_name

    class Meta:
        managed = True
        db_table = "management_supplier"

# ─── Inventory ───
class InventoryItem(models.Model):
    item_id = models.CharField(max_length=10, primary_key=True, editable=False)
    item_name = models.CharField(max_length=255)
    brand = models.CharField(max_length=100, blank=True, null=True)
    category = models.CharField(max_length=100)
    size = models.CharField(max_length=50, blank=True, null=True)
    quantity = models.IntegerField()
    uom = models.CharField(max_length=50)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2)
    selling_price = models.DecimalField(max_digits=10, decimal_places=2)
    supplier = models.ForeignKey(Supplier, to_field='supplier_id', on_delete=models.SET_NULL, null=True, blank=True, related_name='inventory_items')
    stock_in_date = models.DateTimeField(default=now)


    def save(self, *args, **kwargs):
        if not self.item_id:
            last = InventoryItem.objects.order_by('-item_id').first()
            if last and last.item_id:
                try:
                    last_id = int(last.item_id.split('-')[1])
                except (IndexError, ValueError):
                    last_id = 0
            else:
                last_id = 0
            self.item_id = f"IT-{last_id + 1:04d}"
        super().save(*args, **kwargs)



    def __str__(self): return self.item_name


# ─── Stockin ───
class StockInRecord(models.Model):
    stockin_id = models.CharField(max_length=15, primary_key=True, editable=False)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.SET_NULL, null=True, blank=True)
    item_id = models.CharField(max_length=50)  # reference to InventoryItem.item_id
    stocked_by_id = models.UUIDField(null=True, blank=True)  # reference to staff_profiles.id
    quantity = models.PositiveIntegerField()
    created_at = models.DateTimeField(default=now)
    remarks = models.TextField(blank=True, null=True)
    supplier_id = models.CharField(max_length=50, blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.stockin_id:
            last = StockInRecord.objects.order_by('-stockin_id').first()
            if last and last.stockin_id:
                try:
                    last_num = int(last.stockin_id.split('-')[1])
                except (IndexError, ValueError):
                    last_num = 0
            else:
                last_num = 0
            self.stockin_id = f"STI-{last_num + 1:04d}"

        # ✅ Manually update inventory quantity based on item_id
        if self.pk is None:
            try:
                item = InventoryItem.objects.get(item_id=self.item_id)
                item.quantity += self.quantity
                item.save()
            except InventoryItem.DoesNotExist:
                pass  # Optionally handle this (e.g., raise error or log)

        super().save(*args, **kwargs)

    def __str__(self):
        return self.stockin_id

    class Meta:
        verbose_name = "Stock In"
        verbose_name_plural = "Stock In"
        db_table = "stockin_records"
        managed = True

#─── Purchase Order ───

class PurchaseOrder(models.Model):
    po_id = models.CharField(max_length=20, primary_key=True, editable=False)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='purchase_orders')
    ordered_by = models.ForeignKey(
        'StaffProfile',
        to_field='id',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='ordered_by',
        related_name='ordered_purchase_orders'
    )
    date_ordered = models.DateTimeField(auto_now_add=True)
    expected_delivery = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=[
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Completed', 'Completed'),
        ('Cancelled', 'Cancelled'),
    ], default='Pending')
    remarks = models.TextField(blank=True, null=True)
    total_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        db_table = "purchase_orders"

    def save(self, *args, **kwargs):
        if not self.po_id:
            last_po = PurchaseOrder.objects.order_by('-po_id').first()
            next_id = 1
            if last_po and last_po.po_id.startswith('PO-'):
                try:
                    last_number = int(last_po.po_id.split('-')[-1])
                    next_id = last_number + 1
                except ValueError:
                    pass  # Handle cases where the last PO ID might not be in the expected format
            self.po_id = f"PO-{next_id:04d}"

        # Auto-calculate total_cost from related PurchaseOrderItem instances
        total = sum(item.total_price for item in self.items.all())
        self.total_cost = total
        super().save(*args, **kwargs)

    def __str__(self):
        return self.po_id


class PurchaseOrderItem(models.Model):
    po = models.ForeignKey(
        PurchaseOrder,
        related_name='items',  # <----- HERE IS THE FIX
        on_delete=models.CASCADE
    )
    item = models.ForeignKey(
        InventoryItem,
        to_field='item_id',
        on_delete=models.CASCADE,
        null=False,
        related_name='purchase_order_items'
    )
    quantity = models.PositiveIntegerField()
    uom = models.CharField(max_length=20)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_price = models.DecimalField(max_digits=12, decimal_places=2, editable=False, default=0)

    def save(self, *args, **kwargs):
        self.total_price = self.quantity * self.unit_price
        super().save(*args, **kwargs)
        self.po.save()

    def __str__(self):
        return f"{self.po.po_id} - {self.item.item_name}"

    class Meta:
        db_table = "purchaseorder_item"


# ─── Customers ───
class Profile(models.Model):
    id = models.UUIDField(primary_key=True)
    customer_id = models.CharField(max_length=20, unique=True, null=True, blank=True)
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    contact = models.CharField(max_length=20)
    company = models.CharField(max_length=255, null=True, blank=True)
    shippingAddress = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField()

    def __str__(self): return self.name

    class Meta:
        managed = True
        db_table = 'profiles'

# ─── Staff ───
class StaffProfile(models.Model):
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Deactivated', 'Deactivated'),
        ('Deleted', 'Deleted'),
    ]
    id = models.UUIDField(primary_key=True)
    staff_id = models.CharField(max_length=10, unique=True, null=True, blank=True)
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=255, unique=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    contact = models.CharField(max_length=14, validators=[phone_validator])
    address = models.TextField(null=True, blank=True)
    role = models.CharField(max_length=100, null=True, blank=True)
    license_number = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active')

    class Meta:
        managed = True
        db_table = 'staff_profiles'

    def __str__(self): return f"{self.staff_id} - {self.name} ({self.role})"



# ─── Custom User ───
class CustomUser(AbstractUser):
    ROLE_CHOICES = [('admin', 'Admin'), ('customer', 'Customer')]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='customer')
    groups = models.ManyToManyField('auth.Group', related_name='customuser_groups', blank=True)
    user_permissions = models.ManyToManyField('auth.Permission', related_name='customuser_permissions', blank=True)

    def __str__(self): return self.username

# ─── Orders ───
ORDER_STATUS_CHOICES = [
    ("Pending", "Pending"),
    ("Packed", "Packed"),
    ("In Transit", "In Transit"),
    ("Delivered", "Delivered"),
    ("Cancelled", "Cancelled"),
]

class Order(models.Model):
    order_id = models.CharField(max_length=100, primary_key=True, editable=False)
    contact = models.CharField(max_length=14, validators=[phone_validator])
    customer_email = models.EmailField()
    customer_name = models.CharField(max_length=255)
    company = models.CharField(max_length=255)
    shipping_address = models.TextField()
    items = models.JSONField()
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=50, choices=ORDER_STATUS_CHOICES, default="Pending")
    date_ordered = models.DateTimeField(null=True, blank=True)
    packed_at = models.DateTimeField(null=True, blank=True)
    in_transit_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    placed_by = models.CharField(max_length=255, null=True, blank=True)
    updated_by = models.ForeignKey(
        StaffProfile,
        to_field='id',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='updated_by',
        related_name='updated_orders'
    )

    def save(self, *args, **kwargs):
        if not self.order_id:
            last = Order.objects.order_by('-order_id').first()
            last_id = int(last.order_id[4:]) if last else 0
            self.order_id = f"ORD-{last_id + 1:04d}"
        super().save(*args, **kwargs)

    def __str__(self): return f"Order {self.order_id} - {self.customer_name}"

    class Meta:
        managed = True
        db_table = 'orders'

# ─── Delivery ───
DELIVERY_STATUS_CHOICES = [
    ("Pending", "Pending"),
    ("Packed", "Packed"),
    ("In Transit", "In Transit"),
    ("Delivered", "Delivered"),
]

class Delivery(models.Model):
    delivery_id = models.CharField(primary_key=True, max_length=50, unique=True)
    order = models.OneToOneField(
        Order,
        to_field="order_id",
        db_column="order_id",
        on_delete=models.CASCADE,
        related_name="delivery"
    )
    driver = models.ForeignKey(
        StaffProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={'role': 'Driver'},
        related_name='deliveries'
    )
    vehicle = models.CharField(max_length=255, blank=True, null=True)
    delivery_date = models.DateField(null=True, blank=True)
    date_delivered = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=DELIVERY_STATUS_CHOICES, default="Pending")

    def save(self, *args, **kwargs):
            if not self.delivery_id:
                today = datetime.now().strftime('%Y%m%d')
                existing = Delivery.objects.filter(delivery_id__startswith=f"DEL-{today}").count()
                self.delivery_id = f"DEL-{today}-{existing + 1:04d}"
            super().save(*args, **kwargs)

    def __str__(self): return f"Delivery {self.delivery_id} for Order {self.order.order_id}"

    class Meta:
        managed = True
        db_table = 'deliveries'