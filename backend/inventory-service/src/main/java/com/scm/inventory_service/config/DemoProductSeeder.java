package com.scm.inventory_service.config;

import com.scm.inventory_service.entity.Product;
import com.scm.inventory_service.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

/**
 * Seeds demo products covering every part of the supply-chain demo.
 * SKUs here must match the SKU locations seeded in warehouse-service.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DemoProductSeeder implements CommandLineRunner {

    private final ProductRepository productRepository;

    private record ProductSeed(
            String sku, String name, String description,
            String imageUrl, BigDecimal price, int qty, int reorder) {}

    private static final List<ProductSeed> PRODUCTS = List.of(
        new ProductSeed("LAPTOP-001",   "Gaming Laptop 15\"",
            "High-performance gaming laptop with RTX 4070, 16GB RAM, 1TB SSD",
            "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=400&q=80",
            new BigDecimal("1299.99"), 45, 10),
        new ProductSeed("PHONE-001",    "Smartphone Pro Max",
            "Flagship smartphone with 6.7\" AMOLED, 256GB, 5G",
            "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=400&q=80",
            new BigDecimal("799.99"), 80, 20),
        new ProductSeed("TABLET-001",   "Tablet Air 11\"",
            "Lightweight tablet with M2 chip, 128GB, Wi-Fi 6",
            "https://images.unsplash.com/photo-1544244015-0df4592987d0?auto=format&fit=crop&w=400&q=80",
            new BigDecimal("499.99"), 60, 15),
        new ProductSeed("HEADSET-001",  "Wireless Noise-Cancelling Headset",
            "Over-ear ANC headset with 30h battery, USB-C charging",
            "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80",
            new BigDecimal("149.99"), 120, 30),
        new ProductSeed("KEYBOARD-001", "Mechanical Keyboard TKL",
            "Tenkeyless mechanical keyboard, Cherry MX Red switches, RGB",
            "https://images.unsplash.com/photo-1541140532154-b024d705b90a?auto=format&fit=crop&w=400&q=80",
            new BigDecimal("89.99"), 95, 25),
        new ProductSeed("MOUSE-001",    "Ergonomic Wireless Mouse",
            "Vertical ergonomic mouse, 4000 DPI, silent clicks",
            "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=400&q=80",
            new BigDecimal("59.99"), 150, 40),
        new ProductSeed("MONITOR-001",  "4K 27\" Monitor",
            "IPS 4K UHD monitor, 144Hz, HDR400, USB-C hub",
            "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=400&q=80",
            new BigDecimal("449.99"), 35, 8),
        new ProductSeed("WEBCAM-001",   "4K Webcam Pro",
            "4K 30fps webcam with auto-focus and noise-cancelling mic",
            "https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=400&q=80",
            new BigDecimal("129.99"), 75, 20),
        new ProductSeed("SSD-001",      "Portable SSD 1TB",
            "USB 3.2 Gen 2 portable SSD, 1050MB/s read, rugged",
            "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=400&q=80",
            new BigDecimal("119.99"), 200, 50),
        new ProductSeed("CABLE-001",    "USB-C 7-in-1 Hub",
            "Aluminum hub: HDMI 4K, 3x USB-A, USB-C PD 100W, SD, microSD",
            "https://images.unsplash.com/photo-1625723967090-c1cc90de5e73?auto=format&fit=crop&w=400&q=80",
            new BigDecimal("39.99"), 300, 80),
        new ProductSeed("CHAIR-001",    "Ergonomic Office Chair",
            "Mesh-back office chair, lumbar support, adjustable armrests",
            "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?auto=format&fit=crop&w=400&q=80",
            new BigDecimal("399.99"), 25, 5),
        new ProductSeed("DESK-001",     "Electric Standing Desk",
            "Height-adjustable standing desk 140x70cm, 4 memory presets",
            "https://images.unsplash.com/photo-1593349480506-8433634cdcbe?auto=format&fit=crop&w=400&q=80",
            new BigDecimal("599.99"), 15, 3),
        new ProductSeed("BAG-001",      "Laptop Backpack 15.6\"",
            "Water-resistant backpack, TSA-friendly, USB charging port",
            "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=400&q=80",
            new BigDecimal("69.99"), 100, 25),
        new ProductSeed("SPEAKER-001",  "Bluetooth Speaker 360°",
            "360° sound, IPX7 waterproof, 24h battery, party mode",
            "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=400&q=80",
            new BigDecimal("89.99"), 90, 20),
        new ProductSeed("CAMERA-001",   "Mirrorless Camera Kit",
            "24MP APS-C mirrorless with 18-55mm kit lens, 4K video",
            "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=400&q=80",
            new BigDecimal("899.99"), 20, 4)
    );

    @Override
    public void run(String... args) {
        if (productRepository.count() > 0) {
            log.info("[DemoProductSeeder] Products already present — skipping.");
            return;
        }

        for (ProductSeed seed : PRODUCTS) {
            Product p = new Product();
            p.setSku(seed.sku());
            p.setName(seed.name());
            p.setDescription(seed.description());
            p.setImageUrl(seed.imageUrl());
            p.setUnitPrice(seed.price());
            p.setQuantity(seed.qty());
            p.setReorderLevel(seed.reorder());
            productRepository.save(p);
        }

        log.info("[DemoProductSeeder] Seeded {} demo products.", PRODUCTS.size());
    }
}
