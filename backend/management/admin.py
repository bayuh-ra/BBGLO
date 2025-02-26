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
    list_display = ('customer_id', 'business_name', 'contact_number')  # Updated
    search_fields = ('business_name', 'contact_number')

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('employee_id', 'first_name', 'last_name', 'role', 'contact_number')
    search_fields = ('first_name', 'last_name', 'role', 'contact_number')

@admin.register(Delivery)
class DeliveryAdmin(admin.ModelAdmin):
    list_display = ("order", "customer", "driver", "status", "delivery_date")
    list_filter = ("status",)
    search_fields = ("order__order_id", "customer__business_name", "driver__first_name")