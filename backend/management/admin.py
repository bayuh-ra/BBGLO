from django.contrib import admin
from django import forms
from .models import (
    Profile,
    Delivery,
    StaffProfile,
    InventoryItem,
    Supplier,
    Order,
    StockInRecord,
    PurchaseOrder,
    PurchaseOrderItem,
)

def item_name(self, obj):
    return obj.item_id  # You can map to item name if you fetch from InventoryItem

def staff_name(self, obj):
    return obj.stocked_by_id  # You can map to staff name if you fetch from StaffProfile



# ---------- Purchase Order ----------
# ─── Inline for PurchaseOrderItem ───
class PurchaseOrderItemInline(admin.TabularInline):
    model = PurchaseOrderItem
    extra = 1
    readonly_fields = ('total_price',)
    autocomplete_fields = ('item',) # Add autocomplete for item

# ─── PurchaseOrder Admin ───
@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    inlines = [PurchaseOrderItemInline]
    list_display = ('po_id', 'supplier', 'status', 'date_ordered', 'get_total_cost')
    readonly_fields = ('get_total_cost', 'po_id') # Include po_id in readonly fields
    autocomplete_fields = ('supplier', 'ordered_by') # Add autocomplete for supplier and ordered_by

    def get_total_cost(self, obj):
        return obj.total_cost
    get_total_cost.short_description = "Total Cost"




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
    readonly_fields = ('item_id', 'stock_in_date') # Include stock_in_date as readonly
    autocomplete_fields = ('supplier',) # Add autocomplete for supplier

# ---------- Stockin ----------
@admin.register(StockInRecord)
class StockInRecordAdmin(admin.ModelAdmin):
    list_display = ('stockin_id', 'item', 'quantity', 'uom', 'date_stocked')  # ✅ update here
    list_filter = ('date_stocked',)  # ✅ and here
    search_fields = ('stockin_id', 'item__item_name')


    def get_queryset(self, request):
        return super().get_queryset(request)

# ---------- Category ----------
from django.contrib import admin
from .models import Category

admin.site.register(Category)

# ---------- Customers (Supabase Profiles) ----------
@admin.register(Profile)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('customer_id', 'name', 'email', 'contact', 'company', 'created_at')
    search_fields = ('name', 'email', 'company', 'customer_id') # Include customer_id in search
    readonly_fields = ('id', 'customer_id', 'name', 'email', 'contact', 'company', 'shippingAddress', 'created_at') # Include customer_id
    ordering = ('-created_at',) # Optional: Order by creation date

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
    list_display = ('id', 'name', 'username', 'email', 'role', 'contact', 'created_at', 'status') # Include status
    search_fields = ('name', 'email', 'username', 'role', 'staff_id') # Include staff_id
    list_filter = ('role', 'status') # Include status in filters
    readonly_fields = ('id', 'created_at', 'staff_id') # Include staff_id as readonly

# ---------- Orders ----------
@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        'order_id', 'customer_name', 'company', 'total_amount', 'status',
        'placed_by', 'updated_by', 'date_ordered',
        'packed_at', 'in_transit_at', 'delivered_at'
    )
    readonly_fields = ('order_id', 'date_ordered', 'packed_at', 'in_transit_at', 'delivered_at') # Make date fields readonly
    list_filter = ('status', 'date_ordered') # Add date_ordered to filters
    search_fields = ('order_id', 'customer_name', 'company', 'placed_by')
    autocomplete_fields = ('updated_by',) # Add autocomplete for updated_by

# ---------- Delivery ----------
@admin.register(Delivery)
class DeliveryAdmin(admin.ModelAdmin):
    list_display = (
        'delivery_id', 'order', 'driver', 'vehicle', 'delivery_date',
        'status', 'date_delivered'
    )
    list_filter = ('status', 'delivery_date') # Add delivery_date to filters
    search_fields = ('delivery_id', 'driver__name', 'vehicle', 'order__order_id')
    readonly_fields = ('delivery_id', 'date_delivered') # Make date_delivered readonly
    autocomplete_fields = ['driver', 'order'] # Add autocomplete for order