from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.timezone import now

class Supplier(models.Model):
    supplier_id = models.CharField(max_length=10, unique=True, blank=True)
    supplier_name = models.CharField(max_length=255)
    contact_no = models.CharField(max_length=15)
    email = models.EmailField()
    address = models.TextField()

    def save(self, *args, **kwargs):
        if not self.supplier_id:
            last_supplier = Supplier.objects.last()
            last_id = int(last_supplier.supplier_id[2:]) if last_supplier else 0
            self.supplier_id = f"SU{last_id + 1:04d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.supplier_name


class InventoryItem(models.Model):
    item_id = models.CharField(max_length=10, unique=True, blank=True)
    item_name = models.CharField(max_length=255)
    category = models.CharField(max_length=100)
    quantity = models.IntegerField()
    stock_in_date = models.DateTimeField(default=now)
    uom = models.CharField(max_length=50)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2)
    selling_price = models.DecimalField(max_digits=10, decimal_places=2)
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True)

    def save(self, *args, **kwargs):
        if not self.item_id:
            last_item = InventoryItem.objects.last()
            last_id = int(last_item.item_id[2:]) if last_item else 0
            self.item_id = f"IT{last_id + 1:04d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.item_name


class Customer(models.Model):
    customer_id = models.CharField(max_length=10, unique=True, blank=True)
    business_name = models.CharField(max_length=255)
    business_email = models.EmailField(unique=True)
    contact_number = models.CharField(max_length=15)
    password = models.CharField(max_length=255)
    is_active = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if not self.customer_id:
            last_customer = Customer.objects.last()
            last_id = int(last_customer.customer_id[4:]) if last_customer else 0
            self.customer_id = f"CUID{last_id + 1:04d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.business_name


class Employee(models.Model):
    EMPLOYEE_ROLES = [
        ("Admin", "Admin"),
        ("Manager", "Manager"),
        ("Driver", "Driver"),
        ("Inventory Clerk", "Inventory Clerk"),
        ("Cashier", "Cashier"),
        ("Delivery Assistant", "Delivery Assistant"),
    ]

    employee_id = models.CharField(max_length=10, unique=True, blank=True)
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    email = models.EmailField()
    contact_number = models.CharField(max_length=15)
    role = models.CharField(max_length=100, choices=EMPLOYEE_ROLES)
    license_number = models.CharField(max_length=50, blank=True, null=True)
    region = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    barangay = models.CharField(max_length=100)
    address = models.TextField()

    def save(self, *args, **kwargs):
        if not self.employee_id:
            last_employee = Employee.objects.last()
            last_id = int(last_employee.employee_id[3:]) if last_employee else 0
            self.employee_id = f"EMP{last_id + 1:04d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class CustomUser(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('customer', 'Customer'),
    ]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='customer')

    groups = models.ManyToManyField(
        'auth.Group',
        related_name='customuser_groups',
        blank=True,
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='customuser_permissions',
        blank=True,
    )

    def __str__(self):
        return self.username


class SalesOrder(models.Model):
    order_id = models.CharField(max_length=10, unique=True, blank=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    order_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Order {self.order_id} - {self.customer.business_name}"


class Delivery(models.Model):
    STATUS_CHOICES = [
        ("Pending", "Pending"),
        ("Packed", "Packed"),
        ("In Transit", "In Transit"),
        ("Delivered", "Delivered"),
    ]

    order = models.OneToOneField(SalesOrder, on_delete=models.CASCADE, related_name="delivery")
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    driver = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'role': 'Driver'})
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Pending")
    delivery_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"Delivery for Order {self.order.order_id} - Status: {self.status}"
