from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('management', '0011_inventoryitem_photo'),
    ]

    operations = [
        migrations.RunSQL(
            """
            CREATE OR REPLACE FUNCTION decrease_inventory_quantity(p_item_id TEXT, p_quantity INTEGER)
            RETURNS void
            LANGUAGE plpgsql
            AS $$
            BEGIN
                -- Update inventory quantity
                UPDATE management_inventoryitem
                SET quantity = quantity - p_quantity
                WHERE item_id = p_item_id;
                
                -- Ensure quantity doesn't go below 0
                UPDATE management_inventoryitem
                SET quantity = 0
                WHERE item_id = p_item_id AND quantity < 0;
            END;
            $$;
            """,
            """
            DROP FUNCTION IF EXISTS decrease_inventory_quantity(TEXT, INTEGER);
            """
        ),
    ] 