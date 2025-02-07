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
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True)  # Dynamic supplier dropdown

    def save(self, *args, **kwargs):
        if not self.item_id:
            last_item = InventoryItem.objects.last()
            last_id = int(last_item.item_id[2:]) if last_item else 0
            self.item_id = f"IT{last_id + 1:04d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.item_name


from django.db import models
from django.utils.timezone import now

# Mindanao Regions, Cities, and Barangays as valid Django choices
MINDANAO_REGIONS = [
    ("Region IX", "Zamboanga Peninsula"),
    ("Region X", "Northern Mindanao"),
    ("Region XI", "Davao Region"),
    ("Region XII", "SOCCSKSARGEN"),
    ("BARMM", "Bangsamoro Autonomous Region in Muslim Mindanao"),
    ("Region XIII", "Caraga"),
]

MINDANAO_CITIES = [
    ("Zamboanga City", "Zamboanga City"),
    ("Dipolog City", "Dipolog City"),
    ("Pagadian City", "Pagadian City"),
    ("Isabela City", "Isabela City"),
    ("Cagayan de Oro", "Cagayan de Oro"),
    ("Iligan City", "Iligan City"),
    ("Malaybalay City", "Malaybalay City"),
    ("Valencia City", "Valencia City"),
    ("Davao City", "Davao City"),
    ("Tagum City", "Tagum City"),
    ("Panabo City", "Panabo City"),
    ("Mati City", "Mati City"),
    ("General Santos", "General Santos"),
    ("Koronadal City", "Koronadal City"),
    ("Tacurong City", "Tacurong City"),
    ("Kidapawan City", "Kidapawan City"),
    ("Cotabato City", "Cotabato City"),
    ("Marawi City", "Marawi City"),
    ("Jolo", "Jolo"),
    ("Bongao", "Bongao"),
    ("Butuan City", "Butuan City"),
    ("Surigao City", "Surigao City"),
    ("Tandag City", "Tandag City"),
    ("Bayugan City", "Bayugan City"),
]

MINDANAO_BARANGAYS = [
    # Zamboanga City
    ("Pasonanca", "Pasonanca"),
    ("Tetuan", "Tetuan"),
    ("Santa Maria", "Santa Maria"),
    ("Guiwan", "Guiwan"),
    
    # Cagayan de Oro
    ("Carmen", "Carmen"),
    ("Lapasan", "Lapasan"),
    ("Kauswagan", "Kauswagan"),
    ("Macasandig", "Macasandig"),
    
    # Davao City
    ("Buhangin", "Buhangin"),
    ("Toril", "Toril"),
    ("Talomo", "Talomo"),
    ("Agdao", "Agdao"),
    
    # General Santos
    ("Lagao", "Lagao"),
    ("Bula", "Bula"),
    ("City Heights", "City Heights"),
    ("Dadiangas", "Dadiangas"),

    # Additional barangays for more cities
    # Dipolog City
    ("Biasong", "Biasong"),
    ("Minaog", "Minaog"),
    ("Olingan", "Olingan"),

    # Pagadian City
    ("Balangasan", "Balangasan"),
    ("Santiago", "Santiago"),
    ("San Pedro", "San Pedro"),

    # Iligan City
    ("Hinaplanon", "Hinaplanon"),
    ("Tubod", "Tubod"),
    ("Pala-o", "Pala-o"),

    # Marawi City
    ("Bangon", "Bangon"),
    ("Lilod", "Lilod"),
    ("Basak Malutlut", "Basak Malutlut"),

    # Cotabato City
    ("Rosary Heights", "Rosary Heights"),
    ("Poblacion", "Poblacion"),
    ("Tamontaka", "Tamontaka"),

    # Butuan City
    ("Doongan", "Doongan"),
    ("Limaha", "Limaha"),
    ("Ampayon", "Ampayon"),
    
    # Surigao City
    ("Luna", "Luna"),
    ("San Juan", "San Juan"),
    ("Taft", "Taft"),
]


class Customer(models.Model):
    customer_id = models.CharField(max_length=10, unique=True, blank=True)
    business_name = models.CharField(max_length=255)
    manager_first_name = models.CharField(max_length=255)
    manager_last_name = models.CharField(max_length=255)
    business_email = models.EmailField()
    contact_number = models.CharField(max_length=15)
    region = models.CharField(max_length=100, choices=MINDANAO_REGIONS)  # Dropdown for region
    city = models.CharField(max_length=100, choices=MINDANAO_CITIES)  # Dropdown for city
    barangay = models.CharField(max_length=100, choices=MINDANAO_BARANGAYS)  # Dropdown for barangay
    address = models.TextField()

    def save(self, *args, **kwargs):
        if not self.customer_id:
            last_customer = Customer.objects.last()
            last_id = int(last_customer.customer_id[4:]) if last_customer else 0
            self.customer_id = f"CUID{last_id + 1:04d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.business_name

    @property
    def inventory_manager_full_name(self):
        """Returns a combined first and last name for display."""
        return f"{self.manager_first_name} {self.manager_last_name}".strip()



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
    role = models.CharField(max_length=100, choices=EMPLOYEE_ROLES)  # Dropdown for role
    license_number = models.CharField(max_length=50, blank=True, null=True)
    region = models.CharField(max_length=100, choices=MINDANAO_REGIONS)  # Dropdown for region
    city = models.CharField(max_length=100, choices=MINDANAO_CITIES)  # Dropdown for city
    barangay = models.CharField(max_length=100, choices=MINDANAO_BARANGAYS)  # Dropdown for barangay
    address = models.TextField()

    def save(self, *args, **kwargs):
        if not self.employee_id:
            last_employee = Employee.objects.last()
            last_id = int(last_employee.employee_id[3:]) if last_employee else 0
            self.employee_id = f"EMP{last_id + 1:04d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"
