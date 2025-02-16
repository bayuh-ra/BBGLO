from django.contrib import admin

from .models import Customer, Delivery, Employee, InventoryItem, Supplier

# Register InventoryItem model
admin.site.register(InventoryItem)

# Register Supplier model with customized admin options
@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ('supplier_id', 'supplier_name', 'contact_no', 'email', 'address')
    search_fields = ('supplier_id', 'supplier_name', 'contact_no', 'email')
    list_filter = ('supplier_name',)

@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('customer_id', 'business_name', 'inventory_manager_full_name', 'contact_number')  # Updated
    search_fields = ('business_name', 'manager_first_name', 'manager_last_name', 'contact_number')

    def inventory_manager_full_name(self, obj):
        """Display the full name of the inventory manager in the admin panel."""
        return obj.inventory_manager_full_name  # Uses the @property method from models.py

    inventory_manager_full_name.short_description = "Inventory Manager"  # Column header name
@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('employee_id', 'first_name', 'last_name', 'role', 'contact_number')
    search_fields = ('first_name', 'last_name', 'role', 'contact_number')

@admin.register(Delivery)
class DeliveryAdmin(admin.ModelAdmin):
    list_display = ("order", "customer", "driver", "status", "delivery_date")
    list_filter = ("status",)
    search_fields = ("order__order_id", "customer__business_name", "driver__first_name")