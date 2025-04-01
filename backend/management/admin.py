from django.contrib import admin
from django import forms
from .models import Profile, Delivery, StaffProfile, InventoryItem, Supplier, Order

# ---------- Supplier ----------
class SupplierAdminForm(forms.ModelForm):
    class Meta:
        model = Supplier
        fields = '__all__'
        widgets = {
            'contact_no': forms.TextInput(attrs={'value': '+63 ', 'maxlength': '16'}),
        }

@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    form = SupplierAdminForm
    list_display = ('supplier_id', 'supplier_name', 'contact_no', 'email', 'address')
    search_fields = ('supplier_id', 'supplier_name', 'contact_no', 'email')
    list_filter = ('supplier_name',)
    readonly_fields = ('supplier_id',)

# ---------- Inventory ----------
@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = (
        'item_id', 'item_name', 'category', 'quantity', 'uom',
        'cost_price', 'selling_price', 'supplier', 'stock_in_date',
    )
    search_fields = ('item_id', 'item_name', 'category', 'supplier__supplier_name')
    list_filter = ('category', 'supplier')
    readonly_fields = ('item_id',)

# ---------- Customers (Supabase Profiles) ----------
@admin.register(Profile)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer_id', 'name', 'email', 'contact', 'company', 'created_at')
    search_fields = ('name', 'email', 'company')
    readonly_fields = ('id', 'name', 'email', 'contact', 'company', 'shippingAddress', 'created_at')

    def has_add_permission(self, request): return False
    def has_change_permission(self, request, obj=None): return False
    def has_delete_permission(self, request, obj=None): return False

# ---------- Staff ----------
class StaffAdminForm(forms.ModelForm):
    class Meta:
        model = StaffProfile
        fields = '__all__'
        widgets = {
            'contact': forms.TextInput(attrs={'value': '+63 ', 'maxlength': '16'}),
        }

@admin.register(StaffProfile)
class StaffProfileAdmin(admin.ModelAdmin):
    form = StaffAdminForm
    list_display = ('id', 'name', 'username', 'email', 'role', 'contact', 'created_at')
    search_fields = ('name', 'email', 'username', 'role')
    list_filter = ('role',)
    readonly_fields = ('id', 'created_at')

# ---------- Orders ----------
@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        'order_id', 'customer_name', 'company', 'total_amount', 'status',
        'placed_by', 'updated_by', 'date_ordered',
        'packed_at', 'in_transit_at', 'delivered_at'
    )
    readonly_fields = ('order_id',)
    list_filter = ('status',)
    search_fields = ('order_id', 'customer_name', 'company', 'placed_by')

# ---------- Delivery ----------
@admin.register(Delivery)
class DeliveryAdmin(admin.ModelAdmin):
    list_display = (
        'delivery_id', 'order', 'driver', 'vehicle', 'delivery_date',
        'status', 'date_delivered'
    )
    list_filter = ('status',)
    search_fields = ('delivery_id', 'driver__name', 'vehicle', 'order__order_id')
    readonly_fields = ('delivery_id',)
    autocomplete_fields = ['driver']
